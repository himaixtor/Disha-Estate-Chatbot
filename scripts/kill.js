#!/usr/bin/env node
/**
 * npm run kill
 *
 * Stops every app started by `npm run dev` (backend API, admin portal,
 * widget demo) — even if `npm run dev` was never gracefully stopped
 * (terminal closed, machine slept, etc.).
 *
 * Two passes, because one alone isn't reliable:
 *   1. Kill whatever is actually bound to each dev port right now.
 *   2. Kill any leftover supervisor process (nodemon / vite / concurrently /
 *      serve) that belongs to THIS project. A supervisor like nodemon
 *      doesn't hold a port itself — its child does — so pass 1 can kill the
 *      child while nodemon quietly relaunches it. Pass 2 catches that.
 *      Matching is scoped to this project's own folder path, so other
 *      Node/Vite projects on the machine are never touched.
 */

const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const isWindows = os.platform() === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const selfPid = process.pid;
const selfPpid = process.ppid;

const PORTS = {
  5002: 'backend API',
  5174: 'admin portal',
  5500: 'widget demo',
};

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function pidsOnPort(port) {
  if (isWindows) {
    const out = safeExec('netstat -ano');
    const pids = new Set();
    out.split(/\r?\n/).forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts[0] !== 'TCP') return;
      const local = parts[1] || '';
      const pid = parts[4];
      if (local.endsWith(`:${port}`) && pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    });
    return [...pids];
  }
  const out = safeExec(`lsof -ti tcp:${port}`);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Returns [{ pid, cmd }] for every running process whose command line
// mentions this project's own folder.
function processesForProject() {
  const results = [];
  if (isWindows) {
    const escaped = projectRoot.replace(/'/g, "''");
    const script = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${escaped}*' } | ForEach-Object { "$($_.ProcessId)|||$($_.CommandLine)" }`;
    const out = safeExec(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`);
    out.split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf('|||');
      if (idx === -1) return;
      const pid = line.slice(0, idx).trim();
      const cmd = line.slice(idx + 3).trim();
      if (/^\d+$/.test(pid)) results.push({ pid, cmd });
    });
  } else {
    const out = safeExec(`pgrep -af "${projectRoot}"`);
    out.split('\n').forEach((line) => {
      const m = line.match(/^(\d+)\s+(.*)$/);
      if (m) results.push({ pid: m[1], cmd: m[2] });
    });
  }
  return results;
}

function killPid(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

console.log('Stopping Disha Estate Chatbot dev servers...\n');

const stopped = new Set();

// Pass 1: kill whatever is actually listening on each dev port.
for (const [port, label] of Object.entries(PORTS)) {
  const pids = pidsOnPort(port);
  if (pids.length === 0) {
    console.log(`  - ${label} (port ${port}): not running`);
    continue;
  }
  pids.forEach((pid) => {
    const ok = killPid(pid);
    console.log(`  - ${label} (port ${port}): ${ok ? 'stopped' : 'could not stop'} (PID ${pid})`);
    if (ok) stopped.add(pid);
  });
}

// Pass 2: sweep any lingering supervisor for this project (nodemon, vite,
// concurrently, serve) that pass 1 couldn't see because it never held a
// port itself. Never touches kill.js's own process or the npm process
// that invoked it, and skips anything that is clearly this very script.
const leftovers = processesForProject().filter(({ pid, cmd }) => {
  if (Number(pid) === selfPid || Number(pid) === selfPpid) return false;
  if (/kill\.js/i.test(cmd)) return false;
  if (stopped.has(pid)) return false;
  return true;
});

leftovers.forEach(({ pid }) => {
  if (killPid(pid)) {
    stopped.add(pid);
    console.log(`  - lingering process (PID ${pid}): stopped`);
  }
});

console.log(stopped.size > 0 ? '\nDone — all sites stopped.' : '\nNothing was running.');

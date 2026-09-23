const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5002/api/v1';

let accessToken = null;
let refreshToken = null;
let onAuthExpired = () => {};

function setTokens(tokens) {
  accessToken = tokens?.accessToken || null;
  refreshToken = tokens?.refreshToken || null;
  if (refreshToken) {
    localStorage.setItem('disha_refresh_token', refreshToken);
  } else {
    localStorage.removeItem('disha_refresh_token');
  }
}

function loadPersistedRefreshToken() {
  refreshToken = localStorage.getItem('disha_refresh_token');
  return refreshToken;
}

function setAuthExpiredHandler(fn) {
  onAuthExpired = fn;
}

async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function request(path, options = {}) {
  let { res, json } = await rawRequest(path, options);

  if (res.status === 401 && options.auth !== false && refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      ({ res, json } = await rawRequest(path, options));
    }
  }

  if (res.status === 401 && options.auth !== false) {
    setTokens({});
    onAuthExpired();
  }

  if (!res.ok || !json?.success) {
    const err = new Error(json?.message || `Request failed (${res.status})`);
    err.code = json?.error?.code;
    err.details = json?.error?.details;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

async function tryRefresh() {
  try {
    const { res, json } = await rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
    if (res.ok && json?.success) {
      setTokens(json.data);
      return true;
    }
  } catch (_e) { /* fall through to logout */ }
  return false;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  setTokens,
  loadPersistedRefreshToken,
  setAuthExpiredHandler,
  get accessToken() { return accessToken; },
};

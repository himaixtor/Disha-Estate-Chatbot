# Deploying to chat.dishaestate.com — first-time setup, start to finish

You've been given:

- A domain + port: **`chat.dishaestate.com:3001`** (already checked — this domain
  currently points at `72.60.223.169`, the same server your panel is on, so DNS
  is already done, nothing to do there).
- A database: **`dishaCHAT`** (MySQL), user `dishaCHAT`, with a password.
- A control panel at **`https://72.60.223.169:8443/`** for the database and
  site settings.

This guide walks through everything from zero, assuming you've never deployed
this app before. All three apps (backend API, admin portal, chat widget) run
as **one single Node.js process**, listening on port 3001 — that's already
built into `backend/src/app.js`, so there's no Nginx config or reverse proxy
for you to write.

```
https://chat.dishaestate.com:3001/api/v1/...   → backend API
https://chat.dishaestate.com:3001/admin        → admin portal (built React app)
https://chat.dishaestate.com:3001/widget.js    → the embeddable chat widget
https://chat.dishaestate.com:3001/widget-demo  → a demo page to test the widget
```

---

## What's already been prepared for you in this repo

Before writing this guide, three things were fixed/prepared locally so you're
not doing them by hand on the server:

1. **`chatbot/demo/index.html` and `chatbot/src/widget.js` no longer hardcode
   `localhost:5002`.** That was the bug you mentioned — the widget's demo page
   had `http://localhost:5002` baked in, which only works on your own machine.
   It now detects local dev vs. production automatically, and the widget's
   built-in default API address is now `https://chat.dishaestate.com:3001/api/v1`.
2. **The admin portal has been built for production** — `chatbot-admin/dist/`
   is generated with `VITE_API_BASE=https://chat.dishaestate.com:3001/api/v1`
   and `/admin/` asset paths baked in. Production builds default to `/admin/`;
   `VITE_BASE_PATH` can override it (see `chatbot-admin/.env.production`).
3. **A `deploy/` folder** (and a zipped copy, `disha-chatbot-deploy.zip`, both
   in the repo root next to this file) containing **only** what needs to go to
   the server — no `node_modules`, no tests, no dev files:

   ```
   deploy/
     backend/                 ← source + package.json (run `npm install` ON the server)
       .env.production        ← rename to .env on the server, see step 3
     chatbot-admin/dist/       ← already-built admin app, ready to serve as-is
     chatbot/src/widget.js     ← the fixed widget script
     chatbot/demo/index.html   ← the fixed demo/test page
     database/01_schema.sql
     database/02_seed.sql
   ```

   This mirrors the folder layout the backend code expects
   (`chatbot-admin/dist` and `chatbot/src` as siblings of `backend/`), so once
   it's uploaded, nothing else needs rewiring.

**One more thing found along the way, not blocking, but worth fixing:** your
local `backend/.env` has a variable named `JWT_SECRET`, but the code only ever
reads `JWT_ACCESS_SECRET` (`backend/src/config/env.js`). That means your local
dev server has silently been running on the fallback dev secret this whole
time. The production `.env.production` prepared for you uses the correct name
— you may want to rename it in your local `.env` too, whenever convenient.

---

## Step 0 — work out what your server gives you access to

You have a database/site panel, but deploying a Node.js app that stays running
needs one more thing: a way to run commands (`npm install`, start the app) and
keep it running after you log out. That's normally either **SSH/terminal
access**, or a panel that has **built-in Node.js app support** (some do this
without needing raw SSH at all). You said you're not sure which you have yet
— here's how to find out once you're logged into `https://72.60.223.169:8443/`:

- Look through the panel's menu for words like **"SSH"**, **"Terminal"**,
  **"Node.js"**, **"Applications"**, or **"Site users"**. Many panels (e.g.
  CloudPanel, Plesk) show an SSH username/password or SSH key for your site
  the moment you open its settings — even if you never asked for one.
- If the panel has an explicit **Node.js app** feature (Plesk's Node.js
  extension is the classic example), it usually lets you set an "application
  root", pick a startup file, click a button to run `npm install`, and
  start/stop/restart the app — all from the browser, no terminal needed. If
  you find this, use it for steps 4–5 below instead of the command-line
  version.
- If you truly only have database access and a plain file manager (no SSH, no
  Node.js app manager anywhere), you won't be able to keep a Node process
  running long-term from the panel alone — you'll need to ask whoever
  provisioned this server for SSH/terminal access, since that's how
  `chat.dishaestate.com:3001` can be serving anything at all right now (a
  Node app must already be running there for that port to work once you point
  a browser at it).

Everything below is written assuming you find SSH/terminal access somewhere
(directly, or through a browser-based terminal in the panel) — that's simplest
to follow. Where a step can only be done through a web UI instead, that's
called out.

---

## Step 1 — log into the database panel and confirm the DB host

Log into `https://72.60.223.169:8443/` yourself with the credentials you have
(this is the one part of this you should do — I don't log into panels or
enter passwords on your behalf).

Find the `dishaCHAT` database and look for a field called **Host**, **Server**,
or **Hostname** next to it.

- If it says `127.0.0.1` or `localhost`, or there's no separate field at all
  (meaning it's just "the local database") — that matches the default already
  set for you in `backend/.env.production` (`DB_HOST=127.0.0.1`). Nothing to
  change.
- If it shows anything else (an internal hostname, a different IP), open
  `deploy/backend/.env.production` and change `DB_HOST` to that value before
  continuing.

This is worth double-checking now because `chat.dishaestate.com` and the panel
both resolve to the same server IP (`72.60.223.169`), so the database is
almost certainly local to that same machine — but "almost certainly" isn't
"certainly", so confirm it here.

---

## Step 2 — get the files onto the server

**If you have SSH/SFTP access:**

Upload `disha-chatbot-deploy.zip` (in the repo root) to the server — with an
SFTP client (FileZilla, WinSCP) pointed at your server, or:

```bash
scp disha-chatbot-deploy.zip yourSshUser@72.60.223.169:/path/to/your/site/
```

Then on the server (over SSH):

```bash
cd /path/to/your/site/
unzip disha-chatbot-deploy.zip
```

**If you don't have SSH, only a File Manager in the panel:**

Upload `disha-chatbot-deploy.zip` through the panel's File Manager into your
site's root folder, then use its "Extract" / "Unzip" option (most panel file
managers have one when you right-click a `.zip`).

Either way, `/path/to/your/site/` is whatever folder your panel calls the
**document root**, **home directory**, or **application root** for
`chat.dishaestate.com` — check the site's settings in the panel for the exact
path if you're not sure. After extracting, you should see this directly
inside it (not nested one level deeper):

```
backend/
chatbot/
chatbot-admin/
database/
```

---

## Step 3 — set up `backend/.env`

On the server, inside the `backend/` folder you just uploaded:

```bash
cd backend
mv .env.production .env
```

Open `.env` and double check (especially if Step 1 told you to change
`DB_HOST`):

```
PORT=3001
DB_HOST=127.0.0.1        # confirmed or corrected in Step 1
DB_USER=dishaCHAT
DB_PASSWORD=XSHvZm7DPszPr50QSPcM
DB_NAME=dishaCHAT
```

Everything else in that file (JWT secrets, license key, WhatsApp settings) has
already been filled in with real, randomly generated production values — you
don't need to touch them.

---

## Step 4 — install dependencies and set up the database

**With SSH:**

```bash
cd backend
npm install
npm run migrate      # creates all tables in dishaCHAT
npm run seed         # seeds roles, categories, subcategories, service sectors
npm run create-admin -- --email you@disha-estate.com --password "SomethingStrong123" --name "Your Name"
```

`migrate` and `seed` are both safe to re-run later (they skip anything that
already exists). `create-admin` creates your first admin-portal login — pick a
real email and a strong password, you'll use these to log into
`/admin`.

**Without SSH (panel database tools only):** this is more manual, but doable.

1. In the panel, find the **Import** / **Run SQL** feature for the `dishaCHAT`
   database (most DB panels have one, often labeled like phpMyAdmin's
   "Import" tab). Import `database/01_schema.sql`, then `database/02_seed.sql`,
   in that order.
2. Creating the admin login needs a password hash, which normally happens in
   Node (`bcryptjs`). You can generate one on your own computer instead —
   from the repo folder on your machine:
   ```bash
   node -e "require('bcryptjs').hash('SomethingStrong123', 12).then(console.log)"
   ```
3. Copy the hash it prints, then run this SQL through the panel's SQL tool
   (replace the email/name/hash):
   ```sql
   INSERT INTO users (uid, email, name, password_hash, role_uid)
   VALUES (UUID(), 'you@disha-estate.com', 'Your Name', '<paste hash here>', '11111111-1111-4111-8111-111111111111');
   ```
   Still, `npm install` for the backend's actual dependencies (`express`,
   `mysql2`, etc.) has no web-UI equivalent — you cannot start the Node app at
   all without running that somewhere with a terminal. If you're on this
   fallback path, this is the point where you really do need to get SSH
   access from your host.

---

## Step 5 — start the app so it stays running

**With SSH**, use a process manager so the app survives you logging out and
restarts if it ever crashes. `pm2` is the standard choice:

```bash
cd backend
npm install -g pm2          # skip if pm2 is already installed
pm2 start src/server.js --name disha-backend
pm2 save
pm2 startup                 # prints one more command — run that too, so pm2 survives a server reboot
```

If `npm install -g` isn't allowed for your user, this also works without
installing anything globally:
```bash
npx pm2 start src/server.js --name disha-backend
```

**If your panel has a built-in Node.js app manager** (found in Step 0):
instead of `pm2`, set it up there — application root = the `backend` folder
you uploaded, startup file = `src/server.js`, then use its own
install/start/restart buttons. The panel manages the process for you in that
case; skip the `pm2` commands above.

---

## Step 6 — verify it's actually working

From anywhere:

```bash
curl http://chat.dishaestate.com:3001/api/v1/health
curl -I http://chat.dishaestate.com:3001/widget.js
```

The first should return a small JSON success response; the second should
return `HTTP/1.1 200 OK`.

Then in a browser:

- `https://chat.dishaestate.com:3001/admin` — should show the Disha Admin
  login screen. Log in with the email/password from Step 4.
- `https://chat.dishaestate.com:3001/widget-demo` — should show a demo page
  with a working chat bubble in the bottom-right corner.

If either of those doesn't load at all (connection refused/times out), the
app likely isn't running, or port 3001 isn't actually open to the outside —
check `pm2 status` (or your panel's app manager) first, then ask your host to
confirm port 3001 is open on that server if the process is definitely running.

---

## Step 7 — embed the widget on a real client site

Since the widget's built-in default now points at your production API, the
entire integration for any client website is just:

```html
<script src="https://chat.dishaestate.com:3001/widget.js"></script>
```

That's it — no config needed for Disha's own default branding/API. To
re-theme it for a specific client or point it at a different API, see
`chatbot/README.md`'s "Re-theming" section.

**Important:** whatever domain a client site is on needs to be added to
`CORS_ALLOWED_ORIGINS` in `backend/.env` on the server, or the chat bubble
will open but every message will fail (check the browser console for a CORS
error if that happens). It's currently set to `*` (allow everyone) since no
real client domains are known yet — that's fine for testing, but tighten it
to a real comma-separated domain list before onboarding real clients:

```
CORS_ALLOWED_ORIGINS=https://client-one.com,https://client-two.com
```

After changing it, restart the app (`pm2 restart disha-backend`, or your
panel's restart button).

---

## Redeploying after a future code change

Whenever you change the backend, widget, or admin portal code locally:

```bash
# admin portal — only if you changed chatbot-admin/src
cd chatbot-admin && npm run build

# re-zip and re-upload deploy/ (or just the changed files) the same way as Step 2
```

Then on the server:

```bash
cd backend
npm install                       # only needed if package.json changed
npm run migrate && npm run seed   # safe to re-run, both are idempotent
pm2 restart disha-backend
```

---

## Quick reference — what goes where

| What | Where it lives locally | Where it goes on the server |
|---|---|---|
| Deploy-ready files | `deploy/` and `disha-chatbot-deploy.zip` (repo root) | Your site's app root on `72.60.223.169` |
| Backend env (production) | `backend/.env.production` | `backend/.env` on the server (renamed) |
| Admin build config | `chatbot-admin/.env.production` | Already baked into `chatbot-admin/dist/` — nothing to copy separately |
| Database schema/seed | `database/01_schema.sql`, `02_seed.sql` | Run via `npm run migrate`/`seed`, or import directly in the DB panel |

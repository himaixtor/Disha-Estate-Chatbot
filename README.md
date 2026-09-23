# Disha Estate Management — AI Property Chatbot Platform

Release 1 codebase: the full property-lead-capture chatbot flow (name → mobile
OTP → category → subcategory → location → inventory match → results), a REST
backend, an embeddable widget, and an admin portal — **no AI/RAG yet**. AI
(Release 2) is deliberately stubbed out; see
`Project_ Disha Estate Management – AI Property Chatbot Platform.md` §61-63
for the full scope split and the reusable-module architecture this was built
around.

No Docker is used anywhere in this repo — everything runs directly with Node.

## Repo layout

```
backend/         Express REST API (Node.js, MySQL 8)
chatbot/          Embeddable vanilla-JS chat widget (Shadow DOM, zero build step)
chatbot-admin/    React + Vite admin portal (leads, taxonomy, users, licenses)
database/         SQL schema + seed data
```

## Quick start: run everything with one command

First-time setup (installs the backend and admin portal dependencies; the
widget needs none):

```
npm install
npm run setup
```

Then, from the repo root:

```
npm run dev     # starts backend (5002), admin portal (5174), widget demo (5500)
npm run kill    # stops all three, however they were started
```

`npm run dev` runs all three apps together and prints their output
side-by-side, prefixed `[BACKEND]` / `[ADMIN]` / `[WIDGET]`. Press `Ctrl+C`
once and all three shut down together, handing you back the prompt.

`npm run kill` is the fallback for when that doesn't happen cleanly (closed
the terminal window, machine went to sleep mid-session, etc.) — it finds
whatever is listening on ports 5002/5174/5500 and stops it, then sweeps any
leftover nodemon/vite/concurrently process from this project specifically,
so nothing quietly respawns in the background. Safe to run any time,
whether anything is running or not.

You still need `backend/.env` filled in (see below) and a running MySQL
server for the backend's DB-backed routes to work — `npm run dev` starts the
backend regardless and just logs a warning if it can't reach the database.
## 1. Backend (`backend/`)

```
cd backend
npm install
cp .env.example .env      # then fill in your real values, see below
npm run migrate           # creates all tables in disha-chatbot
npm run seed              # seeds roles, categories, subcategories, service sectors
npm run create-admin -- --email you@disha-estate.com --password "Something Strong" --name "Your Name"
npm run dev                # or: npm start
```

The server listens on `PORT` (default `5002`) and exposes the API under
`/api/v1/...` (auth, chat, categories, subcategories, service-sectors, leads,
admin, licenses, ai).

**`.env` values you must set yourself** (this was never built against a real
database from this environment — only a blank MySQL Router bootstrap wizard
screenshot was ever shared, no actual host/user/password):

- `DB_HOST`, `DB_PORT` (3306), `DB_USER`, `DB_PASSWORD`, `DB_NAME` (`disha-chatbot`)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate real random strings, don't ship the placeholders
- `CORS_ALLOWED_ORIGINS` — include the admin portal's origin (`http://localhost:5174` in dev)
- `ENABLED_MODULES=verification,inventory` — the pluggable-module switch (leave `ai` out until Release 2)
- WhatsApp OTP: leave `WHATSAPP_API_URL`/`WHATSAPP_API_TOKEN` empty to use the console channel (OTP is logged to the server console) until you have real WhatsApp Business API credentials

Run `npm test` to run the unit tests (`node:test`, no DB required).

### Manual steps only you can do

This session's build sandbox cannot reach your MySQL server or run a live
end-to-end server test against it (network isolation of the build VM), so
before going further **on your own machine**:

1. Run `npm run migrate` and `npm run seed` from `backend/` against your real `disha-chatbot` database.
2. Run `npm run create-admin -- ...` to create your first login.
3. Start the server (`npm run dev`) and confirm `GET http://localhost:5002/api/v1/health` responds.

## 2. Admin portal (`chatbot-admin/`)

```
cd chatbot-admin
npm install
cp .env.example .env      # VITE_API_BASE, defaults to http://localhost:5002/api/v1
npm run dev                 # http://localhost:5174
```

Pages: Dashboard, Leads & Chats (view/pin/change status, read conversation
history), Categories (+ inline subcategory management), Service Sectors,
Users (create/deactivate, role-based), Licenses (create/activate/suspend/renew).

Login uses the admin user you created with `create-admin`. Sign-in
persists a refresh token in `localStorage` and silently refreshes the
access token on 401s.

`npm run build` has been verified to produce a working production bundle in
this environment (`dist/`).

> Note: this scaffold's default Vite 8 (`rolldown-vite`, its new
> experimental native-Rust bundler) crashes with a low-level "Bus error" in
> this sandboxed build environment, so `vite`/`@vitejs/plugin-react` were
> pinned back to the stable, esbuild/rollup-based Vite 6 line. If you ever
> bump these versions, re-run `npm run build` to make sure the native
> bundler you land on actually runs wherever you build.

## 3. Chat widget (`chatbot/`)

Plain HTML/CSS/JS, no build step, no npm install needed. Embed it in any page:

```html
<script src="chatbot/src/widget.js"></script>
<script>
  DishaChatbot.init({ apiBase: 'http://localhost:5002/api/v1' });
</script>
```

See `chatbot/README.md` for full config options, and `chatbot/demo/index.html`
for a working demo host page (open it directly in a browser once the backend
is running).

## Module architecture (why this is reusable across projects)

Nothing in `backend/src` imports a concrete WhatsApp/inventory/AI
implementation directly. Every consumer goes through
`backend/src/modules/registry.js`, which reads `ENABLED_MODULES` from
`.env` and wires up whichever implementation of `VerificationChannel`,
`InventoryProvider`, or `AIProvider` is configured. To reuse this codebase
on a different client project: drop in a new implementation of the
relevant interface, register it in `registry.js`, flip the env var — no
other file changes. See `backend/README.md` for the interface contracts.

## What's still open (Release 2, deferred by design)

- AI Middleware / RAG / ChromaDB — stubbed only (`StubAIProvider`), see the
  blueprint's section F and the `.md` file §61 for the planned scope.
- Real WhatsApp Business API integration (console/log-based OTP channel is
  the Release 1 default; swap in real credentials via `.env` whenever
  ready — no code changes needed beyond that).
- Real inventory/property-matching provider (currently `MockInventoryProvider`).

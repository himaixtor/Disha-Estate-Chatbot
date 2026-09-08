# Disha Chatbot — Backend (Release 1)

Node.js/Express API for the Disha Estate Management chatbot platform. Owns
auth, the chatbot workflow state machine, taxonomy management, leads, and the
module registry described in the project blueprint (`§ Module architecture`).

No AI/RAG code lives here yet — that's Release 2. The `/ai` route and
`AIProvider` interface exist so the widget's hook is real, but respond with a
fixed "coming soon" message until the `ai` module is enabled.

## Setup

```bash
cp .env.example .env      # then fill in DB_USER / DB_PASSWORD for your MySQL
npm install
npm run migrate            # creates all 16 tables in the disha-chatbot database
npm run seed                # roles, categories/subcategories, sample service sectors
npm run create-admin -- --email you@disha-estate.com --password "SomethingStrong123" --name "Your Name"
npm run dev                 # http://localhost:5002
```

`GET /api/v1/health` works even before you've set up the database — it reports
`degraded` instead of crashing so you can confirm the server itself is up.

## Module architecture

`ENABLED_MODULES` in `.env` controls which pluggable implementations are wired
up by `src/modules/registry.js` — the only file that should ever import a
concrete module implementation. See the blueprint's "Module architecture"
section for the full rationale; short version: turning WhatsApp verification,
inventory matching, or (in Release 2) AI Q&A on or off for a future project is
a config change here, never a rewrite of the workflow engine.

- `verification` — defaults to a console-logging channel for local dev; set
  `WHATSAPP_API_URL`/`WHATSAPP_API_TOKEN` to switch to real WhatsApp delivery.
- `inventory` — Release 1 always uses the mock provider (`MockInventoryProvider`)
  since Disha's real property inventory API hasn't been delivered yet.
- `ai` — intentionally left out of the default `ENABLED_MODULES` list. Route
  and interface exist; no real implementation until Release 2.

## Project layout

```
src/
  config/       env + MySQL pool
  middleware/   auth, RBAC, error handling, rate limiting, validation
  modules/      verification / inventory / ai — see above
  db/repositories/   parameterized SQL, one file per table family
  services/     business logic (workflow state machine, OTP, auth, licenses)
  controllers/  thin HTTP handlers
  routes/       route wiring, matches the blueprint's API spec (§C)
scripts/        migrate.js, seed.js, createAdmin.js
tests/          node:test unit tests (pure-logic services only)
```

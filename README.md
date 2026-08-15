# Budget Tracker Dashboard

A single-page, spreadsheet-style personal budget tracker — Angular 19 (Signals, Standalone
Components) + Tailwind, with click-to-edit inline cells and a no-scroll "fits like Excel" layout.
Data is persisted through [`budget-tracker-api`](../budget-tracker-api) to a real PostgreSQL
database, so nothing lives in `localStorage` anymore.

## Run it

You need both servers running:

```bash
# 1) Backend — http://localhost:8082 (connects to Neon via budget-tracker-api/.env)
cd ../budget-tracker-api
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk}"
mvn spring-boot:run

# 2) Frontend — http://localhost:4202 (proxies /api/** to the backend, see proxy.conf.json)
npm start
```

Open **http://localhost:4202**. If the backend isn't reachable, a small red banner appears at the
top of the dashboard.

## Data model

Everything is **actual-only** (no budget targets) — a checkbook-register style sheet:

- **Categories** — Income / Expenses / Bills / Saving / Debt line items.
- **Actual entries** — the real amount logged per category, per month.
- **Start balance** — a manually-entered rollover balance for the month.

All edits (category names, amounts, start balance) are click-to-edit inline and save to Postgres
immediately in the background.

## Database

Backed by Neon (hosted Postgres) — see `budget-tracker-api/README.md` for connection details and
how to point it at a different database (local Postgres, Render, Supabase, etc.) instead. No
frontend changes are ever needed to switch — it only talks to `budget-tracker-api` over HTTP.

# SpendWise

> Track student income and expenses with categories, monthly charts, and CSV import/export.

**Author:** Harshitha  
**Stack:** React · TypeScript · Vite · Tailwind · Node/Express · Prisma · SQLite · JWT · Recharts  
**Status:** MVP complete

## Problem

Students need a simple way to see where money goes without bank APIs or budgeting complexity. SpendWise focuses on logging income and expenses, grouping by category, charting a month at a glance, and moving data in or out via CSV.

## Why this project

Third app in the portfolio program — builds on StudyFlow by adding server-side aggregations and file import/export on the same full-stack stack.

## Features (MVP)

- [x] Authentication (register / login, JWT)
- [x] Categories (income / expense, owner-scoped)
- [x] Income and expense CRUD
- [x] Monthly summary chart (Recharts)
- [x] CSV export and import (same columns)
- [x] Demo seed for local interviews

## Features (Future)

- Budgets with alerts
- Bank account linking
- Receipt OCR
- Multi-currency FX
- Shared household budgets

## Architecture

The React client talks to an Express API over JSON. After login, the client stores a JWT and sends it as `Authorization: Bearer` on protected calls. Express verifies the token, scopes every query to that user, and reads/writes SQLite through Prisma.

```
client (React + Vite) --JWT--> server (Express) --> Prisma --> SQLite
```

Main folders:

- `client/` — Vite React + TypeScript + Tailwind UI
- `server/` — Express API (`/api/auth`, `/api/categories`, `/api/transactions`, `/api/summary`, `/api/csv`)
- `server/prisma/` — schema, migrations, seed script

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind |
| Backend | Node + Express + TypeScript |
| DB | SQLite via Prisma |
| Auth | JWT + bcrypt |
| Charts | Recharts |
| CSV | Hand-rolled parse/serialize (shared columns) |

## Database

- **User** — `email`, `passwordHash`, optional `name`
- **Category** — `name`, `kind` (`income` \| `expense`), optional `color`, per-user
- **Transaction** — positive `amount`, `type`, `date`, optional `note`, `categoryId`, `userId`

```bash
cd server && npx prisma migrate dev
npx prisma db seed
```

## APIs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | No | Health check |
| POST | /api/auth/register | No | Create user, return JWT |
| POST | /api/auth/login | No | Login, return JWT |
| GET | /api/auth/me | Yes | Current user |
| GET/POST/PATCH/DELETE | /api/categories… | Yes | Category CRUD |
| GET/POST/PATCH/DELETE | /api/transactions… | Yes | Transaction CRUD |
| GET | /api/summary/month | Yes | Monthly totals + chart series |
| GET | /api/csv/export | Yes | Download CSV |
| POST | /api/csv/import | Yes | Import CSV (`{ csv }`) |

Full shapes: [`docs/API.md`](./docs/API.md). Scope: [`docs/SCOPE.md`](./docs/SCOPE.md).

## Charts how-to

1. Sign in (or use the demo account after seeding).
2. Open **Dashboard** — the **Monthly summary** section loads the current month from `GET /api/summary/month`.
3. Use the month picker to change year/month.
4. Charts show:
   - **Expense by category** (horizontal bars)
   - **Income & expense by day** (grouped bars for days with activity)
5. Add or delete transactions; the summary refreshes automatically.

## CSV how-to

Import and export use the **same header and columns**:

```text
date,type,category,amount,note
2026-09-01,expense,Groceries,520.50,Weekly shop
2026-09-02,income,Stipend,8000,
```

Rules:

- `date` — `YYYY-MM-DD`
- `type` — `income` or `expense`
- `category` — category name (matched with type; created if missing on import)
- `amount` — positive number
- `note` — optional (empty cell is fine)

**Export:** Dashboard → CSV section → optional from/to dates → **Download CSV**.

**Import:** Choose a `.csv` file with that header. New categories are created when a name+type pair does not exist yet.

## Demo

- **Live frontend:** local only  
- **API:** local only  
- **Demo login** (after seed): `demo@spendwise.local` / `demo1234`

## Setup (local)

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm run install:all
```

### Server

```bash
cd server
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Client

```bash
cd client
cp .env.example .env
npm run dev
```

Or from root: `npm run dev` (client + server via concurrently).

Open http://localhost:5173 — API health at http://localhost:5000/api/health.

## Challenges

1. **Owner-scoped money data** — Every category, transaction, summary, and CSV path filters by `userId` so one account never sees another’s rows.
2. **Month boundaries vs stored dates** — Transactions store calendar days as UTC midnight; the summary API aggregates with matching UTC month bounds so charts and filters stay aligned.
3. **Round-trip CSV** — Export and import share one column list and parser so a downloaded file can be edited and re-imported without inventing a second format.

## What I learned

- How to aggregate owner-scoped rows into chart-ready series on the server
- Why import/export should share the same schema (columns + validation)
- Creating missing categories safely during CSV import without leaking other users’ data
- Reusing StudyFlow chart patterns (Recharts + design tokens) in a finance domain

## Future work

- Budgets with alerts (explicitly out of this MVP)
- Bank linking / receipt OCR
- Deploy API + client (currently local demo + seed)

## Screenshots

| Screen | Image |
|---|---|
| Dashboard / charts | Add under `docs/screenshots/` when capturing locally |
| CSV tools | Add under `docs/screenshots/` when capturing locally |

## Repo

- GitHub: https://github.com/harshitha22102008/spendwise

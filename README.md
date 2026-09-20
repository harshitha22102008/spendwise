# SpendWise

> Track student income and expenses with categories, monthly charts, and CSV import/export.

**Author:** Harshitha  
**Stack:** React · TypeScript · Vite · Tailwind · Node/Express · Prisma · SQLite · JWT  
**Status:** In progress

## Problem

Students need a simple way to see where money goes without bank APIs or budgeting complexity. SpendWise focuses on logging income/expenses, grouping by category, and moving data via CSV.

## Why this project

Third app in the portfolio program — builds on StudyFlow by adding aggregations and file import/export on the same full-stack stack.

## Features (MVP)

- [x] Authentication (register / login)
- [x] Categories
- [x] Income and expense CRUD
- [x] Monthly summary chart
- [x] CSV export and import

## Features (Future)

- Budgets with alerts
- Bank account linking
- Receipt OCR
- Multi-currency FX

## Database

- **User** — email, passwordHash, name
- **Category** — name, kind (`income` | `expense`), color, per-user
- **Transaction** — amount, type (`income` | `expense`), date, note, categoryId

```bash
cd server && npx prisma migrate dev
```

## Architecture

```
client (React) --JWT--> server (Express) --> Prisma --> SQLite
```

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
npx prisma migrate dev   # after schema lands
npm run dev
```

### Client

```bash
cd client
cp .env.example .env
npm run dev
```

Or from root: `npm run dev` (client + server via concurrently).

Open http://localhost:5173 — API at http://localhost:5000/api/health.

## Repo

- GitHub: https://github.com/harshitha22102008/spendwise

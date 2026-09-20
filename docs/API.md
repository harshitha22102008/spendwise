# SpendWise API notes

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create user; returns `{ token, user }` |
| POST | /api/auth/login | No | Verify credentials; returns `{ token, user }` |
| GET | /api/auth/me | Yes | Current user |

Bearer JWT in `Authorization` header. Passwords hashed with bcrypt; token expires in 7 days.

## Categories

Owner-scoped. `kind` is `income` or `expense`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/categories | Yes | List categories (`?kind=` optional) |
| POST | /api/categories | Yes | Create `{ name, kind, color? }` |
| PATCH | /api/categories/:id | Yes | Update name / kind / color |
| DELETE | /api/categories/:id | Yes | Delete (409 if transactions exist) |

## Transactions

Owner-scoped. `type` is `income` or `expense`. Category must belong to the user and its `kind` must match `type`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/transactions | Yes | List (`?type=&categoryId=&from=&to=` optional) |
| POST | /api/transactions | Yes | Create `{ categoryId, amount, type, date, note? }` |
| PATCH | /api/transactions/:id | Yes | Update fields |
| DELETE | /api/transactions/:id | Yes | Delete |

## Summary

Owner-scoped monthly aggregations for dashboard charts.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/summary/month | Yes | Monthly totals, expense by category, daily income/expense (`?year=&month=` optional; defaults to current local month) |

## CSV

Owner-scoped. Import and export use the same columns: `date,type,category,amount,note`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/csv/export | Yes | Download CSV (`?from=&to=` optional) |
| POST | /api/csv/import | Yes | Body `{ csv: string }`; creates missing categories by name+type |


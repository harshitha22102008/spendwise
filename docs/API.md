# SpendWise API notes

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create user; returns `{ token, user }` |
| POST | /api/auth/login | No | Verify credentials; returns `{ token, user }` |
| GET | /api/auth/me | Yes | Current user |

Bearer JWT in `Authorization` header. Passwords hashed with bcrypt; token expires in 7 days.

---
description: Apply database migrations safely.
---

1. Stop backend dev work if possible.
2. Confirm `.env` values match compose.
3. `npx prisma migrate dev` for schema updates.
4. `npx prisma migrate status`.
5. `npm run validate`.
6. Never use `prisma db push` on shared or production databases.
7. Use `npx prisma migrate deploy` for production runtime only.

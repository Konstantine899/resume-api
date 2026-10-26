# CONFIG.md

## Environment

- `DATABASE_URL` — PostgreSQL connection
- `JWT_SECRET` — signing secret, minimum 32 bytes
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — seed user
- `FRONTEND_ORIGIN` — CORS allowlist origin
- `SWAGGER_ENABLED` — local docs only, off in production
- `PORT` — listen port
- `NODE_ENV` — development or production

## Prisma

- schema: `prisma/schema.prisma`
- CLI config: `prisma7.config.ts`
- migrations: `prisma/migrations/`
- generated client: `src/generated/prisma`

## Docker

- `db` = primary PostgreSQL on 5432
- `db-test` = test PostgreSQL on 5433

## Security

- RFC 7807 error body
- throttler per IP + login policy
- authenticated admin routes only
- magic bytes and UUID filenames for uploads
- secure cookies and same-origin frontend pairing

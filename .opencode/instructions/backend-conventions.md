# Backend conventions for resume-api

## Architecture

- Work by DDD verticals under `src/modules/*`.
- `domain`: invariants, aggregates, value objects only.
- `application`: use cases and ports.
- `infrastructure`: Prisma, storage, JWT, filesystem adapters.
- `presentation`: HTTP contracts only.

## Prisma

- `schema.prisma` changes must produce a migration.
- `npm run prisma:generate` belongs to schema edits.
- `prisma db push` is forbidden on shared or production databases.
- Production apply path is `npx prisma migrate deploy`.
- Never edit `src/generated/prisma`.

## API

- Use zod and OpenAPI align with `checked:contract`.
- Return RFC 7807 for all HTTP errors.
- Guard admin writes and never expose public registration.
- Uploads must validate magic bytes and use UUID storage names.

## Security

- Secrets stay in `.env`.
- Tokens are never written to logs.
- Activation secrets must have at least 32 bytes of entropy.
- Upload limits use the configured maximum.

## Testing

- `npm run validate` is the required gate before claiming completion.
- e2e tests require Postgres.
- Port conflicts and database ports are shared test infrastructure.s

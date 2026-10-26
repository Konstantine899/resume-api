# AGENTS.md

Backend API for the personal portfolio.

## Stack

- NestJS 12.2
- TypeScript 6.0.3
- PostgreSQL 17
- Prisma 7.10.1
- argon2id + JWT
- Vitest

## Validation

- `npm run validate` is required before declaring completion.
- It runs `npm run type-check`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run test:e2e`, and `npm run build`.
- E2E tests require a reachable PostgreSQL instance (`resume_api_test` or `resume_api`).

## Migration

- Use `npx prisma migrate dev` locally.
- Use `npm run prisma:generate` after schema changes.
- Never use `prisma db push` on shared or production databases.
- Production apply is `npx prisma migrate deploy`.

## Architecture

- `domain`: invariants, aggregates, value objects
- `application`: use cases
- `infrastructure`: persistence, DTO adapters, JWT, crypto, storage
- `presentation`: HTTP contracts
- Prisma must stay in `infrastructure`

## Security

- Secrets live only in `.env`
- RFC 7807 is the error-body shape
- Zod is the validation authority
- Access tokens are memory only
- Refresh tokens are httpOnly
- Uploads require magic bytes and random UUID file names
- Swagger is enabled only in local development

## Process Safety

- target a single PID before stopping services
- never mass kill by image
- do not mutate Docker without review
- restore before claiming cleanup completion

## Git

- branches from `dev`
- pull requests always `--base dev`
- merge only after checks green

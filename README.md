# resume-api

Backend API for the portfolio app (D:\Dev\projects\resume). Stack: NestJS + Prisma + PostgreSQL. Plan: see owner's vault (wiki/plan/plan_backend_platform.md)

## Getting started

```bash
docker compose up -d        # db (5432) + db-test (5433)
npm ci
npm run prisma:generate
cp .env.example .env        # then set JWT_SECRET (min 32 bytes)
npm run validate            # type-check, lint, format, unit + e2e tests, build
npm start                   # http://localhost:3000
```

## Endpoints

| Route               | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `GET /health/live`  | Liveness: the process answers. No versions, no environment.                         |
| `GET /health/ready` | Readiness: Prisma pings the database with `SELECT 1`; `503` when it is unreachable. |
| `GET /docs`         | Swagger UI — only when `SWAGGER_ENABLED=true` **and** `NODE_ENV != production`.     |
| `GET /openapi.json` | OpenAPI document — same gating as `/docs`.                                          |

## Configuration

All configuration is validated with zod at startup (`src/config/env.ts`); an invalid
value (for example a `JWT_SECRET` shorter than 32 bytes) aborts the process with a
message that names the offending variable.

## Logging

HTTP logs come from `pino-http`, application logs from a pino-backed Nest logger
(`src/logger/`). Every request carries a correlation id, echoed back as the
`x-request-id` header, and credentials/tokens/cookies are redacted.

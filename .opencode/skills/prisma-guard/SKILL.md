---
name: prisma-guard
description: Prisma migration and restore safety
owner: ddd-architect
version: 1.0.0
---

Use this skill for schema or migration work.

Rules:

- `npm run prisma:generate` after `prisma/schema.prisma` changes
- local changes use `npx prisma migrate dev`
- production runtime apply only via `npm run prisma:migrate deploy` in release with `PROD_DATABASE_URL`
- never use `prisma db push` on shared or production databases
- generated client (`src/generated/prisma`) is never hand-edited
- preserve or restore backup before experimenting

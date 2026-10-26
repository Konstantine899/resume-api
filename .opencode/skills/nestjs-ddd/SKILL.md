---
name: nestjs-ddd
description: NestJS DDD module boundaries
owner: ddd-architect
version: 1.0.0
---

Use this skill when creating or reviewing modules.

Rules:

- domain depends on nothing external
- application owns ports and use cases
- infrastructure adapts Prisma, storage, tokens, crypto
- presentation only carries HTTP contracts
- Prisma code must live in infrastructure only
- cross-context access uses explicit interfaces and provider injection

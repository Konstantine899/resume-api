# AGENTS.md

## Git workflow

- Ветки создаются ТОЛЬКО от `dev`. В `main` — только через merge из `dev`.
- DRAFT PR открывается при старте работы на ветке.
- `gh pr create` ВСЕГДА с явным `--base dev` (default-branch репозитория — `main`, PR без `--base` уйдёт не туда).
- Мерж: авто-режим плана владельца разрешает автоматический мерж после зелёных чеков, иначе — только по слову владельца. Мерж squash.

## Валидационный гейт

- `npm run validate` (= `type-check` + `lint` + unit tests) — перед каждым коммитом-сдачей, обязательно зелёный.
- `npm run test:e2e` — отдельный smoke против test-postgres (docker-compose, порт 5433; CI поднимает postgres-service). НЕ входит в validate.
- `npm run build` — отдельная команда (не входит в validate), тоже должна быть зелёной перед сдачей.
- `npm run format:check` — проверка форматирования.

## Конвенции

- **Conventional Commits** (без Co-Authored-By / AI-атрибуции).
- **SPEC-driven фичи**: папка `src/modules/<name>/spec/` — `SPEC.md` пишется ПЕРВЫМ, `TODO.md` сгорает по мере работы.
  Статусы frontmatter: `draft` → `approved` → `done`. SPEC и TODO — на русском.

## Стек (зафиксировано планом owner)

- NestJS ^12, Prisma ^7 (**ловушка: `@prisma@^7`**, не v6), PostgreSQL, argon2id, JWT.
- Node — см. `.node-version` (LTS major 24). Держи devDependencies на свежих версиях (конвенция «always latest»).

## Gotchas

- Никогда не пайпать `npm install` / `npm ci` через `| tail` — маскирует ошибки (ERESOLVE и т.п.).
- Репозиторий ПУБЛИЧНОЕ: `.env` в `.gitignore`, секретов в репо и в коммитах быть не должно (см. `.env.example`).
- **Prisma 7 (ловушки):**
  - `npm view prisma version` отдаёт `8.0.0-rc.x` — ставить ТОЛЬКО `prisma@^7` и `@prisma/client@^7` явно.
  - Конфиг — `prisma7.config.ts` в корне (datasource.url из env), в `schema.prisma` НЕТ `url`.
  - Клиент генерируется ГЕНЕРАТОРОМ `prisma-client` как TS-исходники в `src/generated/prisma` (в `.gitignore`); entry — `client.ts`, импорт `../../generated/prisma/client`.
  - Обязателен driver adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` (`@prisma/adapter-pg` тянет `pg` внутри).
  - `npm ci`/`npm install` генерит клиента через `postinstall` — type-check/build/e2e падают без него.
- **nestjs-pino / pino-http:** дефолтный `genReqId` НЕ пишет `x-request-id` в ответ — наш кастомный и читает inbound-header, и ставит его в response (см. `src/app.module.ts`).
- **Nest 12 → platform-express → Express 5** — `@types/express` major 5; не «чинить» до 4.
- **Vitest + декораторы Nest:** esbuild не эмитит `design:paramtypes` — в обоих vitest-конфигах `unplugin-swc` + `@swc/core` (jsc: decorators + legacyDecorator + decoratorMetadata). Конфиги named `.mts` (пакет CJS — `.ts`-конфиг давал warning «ESM in CJS»).
- **docker-compose (postgres:18-alpine):** образ ОЖИДАЕТ volume на `/var/lib/postgresql` (данные в версионированном подкаталоге); маунт `/var/lib/postgresql/data` = exit 1 с сообщением про pg_upgrade. Dev — 5432, test — 5433 (`npm run db:up` поднимает оба с healthcheck).
- ESLint-конфиг — ESM (`eslint.config.mjs`) в CJS-пакете: работает нативно, не переносить в `.cjs`.
- CI job называется `build` — это required check из Ruleset; переименовывать нельзя.
- `src/generated/` в `.gitignore` + eslint-ignores + `.prettierignore` — иначе lint/prettier падают на сгенерированном клиенте.

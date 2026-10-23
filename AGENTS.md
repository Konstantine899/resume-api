# AGENTS.md

## Git workflow

- Ветки создаются ТОЛЬКО от `dev`. В `main` — только через merge из `dev`.
- DRAFT PR открывается при старте работы на ветке.
- `gh pr create` ВСЕГДА с явным `--base dev` (default-branch репозитория — `main`, PR без `--base` уйдёт не туда).
- Мерж: авто-режим плана владельца разрешает автоматический мерж после зелёных чеков, иначе — только по слову владельца. Мерж squash.

## Валидационный гейт

- `npm run validate` (= `type-check` + `lint` + unit tests) — перед каждым коммитом-сдачей, обязательно зелёный.
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
- docker-compose для локального Postgres появится в Шаге 2 плана — сейчас его нет.
- ESLint-конфиг — ESM (`eslint.config.mjs`) в CJS-пакете: работает нативно, не переносить в `.cjs`.

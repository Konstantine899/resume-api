# resume-api

Backend API для портфолио-приложения (frontend: `D:\Dev\projects\resume`).

## Стек (зафиксировано планом владельца)

- **NestJS ^12** + **Prisma ^7** (ловушка: `@prisma@^7`, не v6)
- **PostgreSQL**
- **argon2id** (хеширование паролей), **JWT** (access/refresh)
- **Node** — см. `.node-version` (LTS major 24)

## Git workflow

- Ветки только от `dev`; DRAFT PR при старте работы.
- `gh pr create` ВСЕГДА с явным `--base dev`; в `main` — только через merge из `dev`.
- Мерж — автоматически после зелёных чеков (auto-mode плана), иначе по слову владельца.

## Валидационный гейт

```bash
npm ci                # установка зависимостей (не пайпить через `| tail`!)
npm run validate      # type-check + lint + unit tests — перед каждым коммитом-сдачей
npm run build         # сборка в dist/ — отдельно
npm run format        # автоформат Prettier
```

## Статус

**Шаг 1 плана (`wiki/plan/plan_backend_platform.md`) — каркас.**
Tooling-скелет: TypeScript 6, ESLint 10 (flat config), Prettier, husky + lint-staged, Vitest, CI.
Кода Nest/Prisma пока нет — он появится в Шаге 2 плана.

## Секреты

Репозиторий публичное. `.env` в `.gitignore` — секретов в репо быть не должно.
Плейсхолдеры: см. `.env.example`.

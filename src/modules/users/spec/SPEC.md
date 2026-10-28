---
status: approved
created: 2026-10-25
epic: backend-platform
step: 3
---

# Users — контракт модуля (краткий; Шаг 3 плана backend-платформы)

Контекст `users` владеет агрегатом `User` (включая роль `admin`) и жизненным
циклом учётных записей. Единственная копия контракта. Детали кросс-контекстной
интеграции — в `../auth/spec/SPEC.md` (§1.4).

> **Automation marker (mandatory): all execution and verification for this module
> MUST be automatic.** No manual validation steps, manual smoke checks, or manual
> QA gating are permitted as completion gates. Every criterion in §2 (U1–U5,
> including U3 registration persistence) must be verifiable by automated
> tests/checks; completion is gated only by `npm run validate` / automated
> specs.

## 1. Доменная модель (domain)

Агрегат `User`: `id` (uuid), `email` (нормализуется в lowercase, уникален),
`role` (`admin` или `user`: `admin` — только через provisioning; `user` —
единственная роль публичной регистрации), `passwordHash` (PHC-строка argon2id;
параметры хранятся в ней же, рядом с хешем), `theme` (`light|dark`, default
`dark`), `language` (`en|ru`, default `ru`), `createdAt`.

Инварианты:

- **U-I1** — email непустой, валидный формат, нормализован (trim + lowercase)
  до записи.
- **U-I2** — `role` принимает только `admin | user`; публичная
  регистрация создаёт ТОЛЬКО `user`; произвольная роль через body/mass assignment невозможна
  на уровне агрегата; `admin` доступен только через `seed:admin` (env).
- **U-I3** — `passwordHash` — PHC-строка `$argon2id$...`; верификация пароля —
  ответственность auth (argon2id OWASP-профиль), не домена `users`.

Порт `UserRepository` (domain) → реализация Prisma только в
`infrastructure/`.

## 2. Наблюдаемые критерии

| #   | Критерий                                                                                                                                                                                                                                                                                                                                         | Слой                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| U1  | `npm run seed:admin` (CLI): idempotent upsert по `ADMIN_EMAIL`; созданный/обновлённый юзер имеет `role=admin` и пароль из env (min 12), верифицируется argon2id                                                                                                                                                                                  | application + infrastructure          |
| U2  | Повторный запуск `seed:admin` не создаёт дубликат (unique по email), обновляет пароль при изменении env                                                                                                                                                                                                                                          | application                           |
| U3  | Публичная регистрация: создаётся пользователь с ролью `USER` (`User.createRegisteredUser` фиксирует роль; `PrismaUserRepository.save` персистит фактическую роль, не hardcoded `ADMIN`, с маппингом `ADMIN<->admin`/`USER<->user`); unique-email на уровне БД — source of truth, репозиторий пробрасывает typed unique-violation (без pre-check) | domain + infrastructure + application |
| U4  | auth получает креденшелы ТОЛЬКО через application-фасад `UserAccountsService`; домен `users` не импортируется в auth                                                                                                                                                                                                                             | application (граница)                 |
| U6  | `UserAccountsService.updatePreferences(userId, { theme?, language? })` частично обновляет предпочтения и возвращает профиль с актуальными `theme`, `language`; несуществующий пользователь → null                                                                                                                                                | application                           |
| U7  | Миграция добавляет колонки `theme`, `language` с default `dark`/`ru` и таблицу `SiteSettings` (см. content SPEC)                                                                                                                                                                                                                                 | infrastructure                        |
| U5  | Миграция создаёт таблицу `User` с unique-index по email; Prisma-код только в `infrastructure`                                                                                                                                                                                                                                                    | infrastructure                        |

## 3. Границы (НЕ в этом шаге)

- Self-service profile, смена пароля — out of scope (OPEN-A2: password-reset
  out of scope). Публичная регистрация добавлена (роль `USER`); см. U3 и
  auth SPEC C12/C19–C24.
- Ролевая модель с 403 (RolesGuard) включается в Шаге 4 на контентных
  write-эндпоинтах.

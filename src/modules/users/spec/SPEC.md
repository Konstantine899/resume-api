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

## 1. Доменная модель (domain)

Агрегат `User`: `id` (uuid), `email` (нормализуется в lowercase, уникален),
`role` (`admin` — единственный возможный: персональный сайт, единственный
пользователь), `passwordHash` (PHC-строка argon2id; параметры хранятся в ней
же, рядом с хешем), `createdAt`.

Инварианты:

- **U-I1** — email непустой, валидный формат, нормализован (trim + lowercase)
  до записи.
- **U-I2** — `role` только `admin`; создание пользователя любой другой роли
  невозможно на уровне агрегата.
- **U-I3** — `passwordHash` — PHC-строка `$argon2id$...`; верификация пароля —
  ответственность auth (argon2id OWASP-профиль), не домена `users`.

Порт `UserRepository` (domain) → реализация Prisma только в
`infrastructure/`.

## 2. Наблюдаемые критерии

| #   | Критерий                                                                                                                                                        | Слой                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| U1  | `npm run seed:admin` (CLI): idempotent upsert по `ADMIN_EMAIL`; созданный/обновлённый юзер имеет `role=admin` и пароль из env (min 12), верифицируется argon2id | application + infrastructure |
| U2  | Повторный запуск `seed:admin` не создаёт дубликат (unique по email), обновляет пароль при изменении env                                                         | application                  |
| U3  | Публичных HTTP-эндпоинтов users-контекста НЕТ: любые users-read/ register-маршруты → 404 (нет роутов)                                                           | presentation (отсутствует)   |
| U4  | auth получает креденшелы ТОЛЬКО через application-фасад `UserAccountsService`; домен `users` не импортируется в auth                                            | application (граница)        |
| U5  | Миграция создаёт таблицу `User` с unique-index по email; Prisma-код только в `infrastructure`                                                                   | infrastructure               |

## 3. Границы (НЕ в этом шаге)

- Публичная регистрация, self-service profile, смена пароля — отсутствуют
  (OPEN-A2: password-reset out of scope).
- Ролевая модель с 403 (RolesGuard) включается в Шаге 4 на контентных
  write-эндпоинтах.

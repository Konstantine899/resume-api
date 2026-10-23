---
status: approved
created: 2026-10-23
verified: 2026-10-23
epic: backend-step3-auth
---

> auto-mode: утверждено на основании §4 Шаг 3 плана, одобренного владельцем 2026-10-23.

# Auth — контракт модуля (Шаг 3 плана backend-платформа)

Единственная копия контракта. Критерии — наблюдаемые исходы; каждый размечен
слоем (domain / application / infrastructure / presentation), в котором
наблюдаемость обеспечивается тестом.

## 1. Доменная модель (пишется первой)

### 1.1 Агрегат `RefreshSession` (domain)

Сессия обновления — агрегат-корень auth-контекста. Состояние хранится в Prisma
(`RefreshSession`), но инварианты ротации и отзыва живут ТОЛЬКО в методах
агрегата (`src/modules/auth/domain/`), БД — носитель состояния, не источник
правил.

Свойства: `id` (uuid), `familyId` (VO `TokenFamily`), `userId`, `deviceId`
(VO), `tokenHash` (SHA-256 hex; сырой токен в агрегате и в БД отсутствует),
`status`, `expiresAt`, `createdAt`, `usedAt?`, `revokedAt?`, `revokedReason?`.

Состояния: `active` → `used` (ротация) / `revoked` (отзыв);
`used` → `revoked` (reuse-детект); `revoked` — терминальное.

Инварианты (методы агрегата, unit-тесты):

- **I1 — ротация:** `rotate()` допустим только из `active` и только пока
  `expiresAt > now`; помечает `used`, выставляет `usedAt`.
- **I2 — отзыв:** `revoke(reason, now)` из любого состояния; повторный вызов —
  no-op (идемпотентно); из `revoked` не выйти.
- **I3 — expiry:** предъявление протухшей `active`-сессии → отказ, не
  ротация (реализуется application-слоем поверх `isExpired(now)`).
- **I4 — reuse → revoke всей семьи:** предъявление сессии в состоянии `used`
  (reuse) → ВСЕ сессии семьи (включая предъявленную) переходят в `revoked`
  с `revokedReason: 'reuse'`. Семья мертва: последующее предъявление любой
  сессии семьи → отказ.

### 1.2 Value objects (domain)

- `TokenFamily` — uuid, генерируется при логине; одна активная семья на
  `deviceId` пользователя (при логине с тем же `deviceId` старая семья
  ревокится, `revokedReason: 'replaced'`).
- `deviceId` — строка, приходит от фронта в заголовке `X-Device-Id`;
  отсутствие/пустота заголовка → 400.

### 1.3 Доменные события (domain/events, потребляет application)

- `TokenRotated` — { familyId, userId, sessionId, rotatedAt } — поднимается
  агрегатом при успешной ротации.
- `TokenFamilyRevoked` — { familyId, userId, reason, revokedAt } — поднимается
  при отзыве семьи (reuse, logout, replaced).

Потребление: application-слой логирует через pino. В логи НИКОГДА не попадают
токены, хеши токенов, пароли (только идентификаторы).

## 2. Наблюдаемые критерии

| #   | Критерий                                                                                                                                                                                                                                 | Слой                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| C1  | `POST /auth/login` с валидными креденшелами → 200 `{ accessToken }` (JWT: `sub`, `role`, `jti`, TTL `JWT_ACCESS_TTL`=15m) + `Set-Cookie` refresh; access-токена в cookie нет                                                             | application + presentation                       |
| C2  | Логин с неверным паролем и логин с несуществующим юзером → ТОТИЧНО одинаковое тело `{ statusCode: 401, message: 'Invalid credentials' }`                                                                                                 | presentation                                     |
| C3  | 6-я подряд неудачная попытка логина (один IP+login, окно 60с) → 429; 1–5-я → 401                                                                                                                                                         | infrastructure (throttler, tracker `ip+login`)   |
| C4  | `POST /auth/refresh` (валидный access-JWT в `Authorization` + refresh-cookie) → ротация: старый статус `used`, новый токен в ту же семью, новый cookie, новый accessToken; 200                                                           | application                                      |
| C5  | Refresh с reuse уже `used`-токена → 401 generic; ВСЯ семья `revoked` (`reason='reuse'`); повторный refresh ЛЮБОЙ сессией этой семьи → 401 (семья мертва)                                                                                 | domain (инвариант I4) + application              |
| C6  | Refresh без access-JWT / с невалидным access-JWT → 401 (rotation binding: refresh-токен никогда не работает один)                                                                                                                        | application                                      |
| C7  | Refresh с просроченным/неизвестным/отозванным токеном → 401 generic `{ statusCode, message }`                                                                                                                                            | application                                      |
| C8  | `POST /auth/logout` → семья по deviceId `revoked` (`reason='logout'`), cookie очищен, 200/204                                                                                                                                            | application + presentation                       |
| C9  | Cookie refresh: `HttpOnly`, `SameSite=Lax` (всегда), `Secure` только при `NODE_ENV=production`, `Path=COOKIE_PATH` (дефолт `/api/auth`), `Max-Age` = refresh TTL                                                                         | presentation (флаги в коде cookie-билдера)       |
| C10 | `POST /auth/refresh` с чужим `Origin` (не из `CORS_ORIGINS`) → 403; отсутствие Origin+Sec-Fetch-Site (не-браузерный клиент) → допускается                                                                                                | presentation (guard)                             |
| C11 | CORS: preflight с origin из allowlist → `Access-Control-Allow-Origin` присутствует; чужой origin → заголовка нет; `credentials: true`                                                                                                    | presentation (enableCors)                        |
| C12 | Публичной регистрации НЕТ: `POST /auth/register` (и любой users-read) → 404; единственный способ создать юзера — `npm run seed:admin` (env `ADMIN_EMAIL`/`ADMIN_PASSWORD`, пароль ≥12 символов, idempotent, `--force` = обновить пароль) | presentation (нет маршрута) + application (seed) |
| C13 | argon2id: `type=argon2id, m=19456, t=2, p=1` (OWASP) — константами в infrastructure рядом с хешем; тест-вектор: хеш одного пароля с фиксированной солью имеет префикс `$argon2id$v=19$m=19456,t=2,p=1$`                                  | infrastructure                                   |
| C14 | В БД refresh-сессии лежит ТОЛЬКО SHA-256 hex токена; raw-токен нигде не персистится и не логируется                                                                                                                                      | domain/application/infrastructure                |
| C15 | Глобальный throttler 100/мин; `/auth/*` жёстче (5/мин, tracker = IP+login)                                                                                                                                                               | infrastructure                                   |
| C16 | CORS-allowlist из `CORS_ORIGINS` (дефолт `http://localhost:5173,http://localhost:3000`), `credentials: true`                                                                                                                             | presentation                                     |

### Границы (не в этом шаге)

- Auth контентных write, RFC 9457-оформление ошибок — Шаг 4.
- password-reset (OPEN-A2) — out of scope.
- Публичные users-read-эндпоинты — нет (появятся позже, если нужно).

## 3. Слои и зависимости

```
domain/           — агрегат RefreshSession, VO TokenFamily/deviceId, события,
                    порты (SessionRepository, UserCredentialsPort,
                    PasswordHasher, TokenIssuer, Clock). Без NestJS/Prisma/HTTP/zod.
application/      — use-cases (login, refresh, logout), потребление событий,
                    generic-ошибки. Без HTTP-объектов.
infrastructure/   — Prisma-репозитории, argon2id (константы), JWT-issuer,
                    SHA-256, throttler-guard, системные часы.
presentation/     — контроллер, zod-DTO (defense in depth), cookie-билдер,
                    Origin-guard, CORS.
auth.module.ts    — composition root (DI).
```

users-модуль (`src/modules/users/`): агрегат User (валидация email, пароль
min 12), порт репозитория + Prisma-реализация, сид-скрипт. Публичных
read-эндпоинтов нет.

## 4. Env (добавляется к уже покрытым)

- `CORS_ORIGINS` — CSV, дефолт `http://localhost:5173,http://localhost:3000`.
- `COOKIE_PATH` — дефолт `/api/auth` (vite-proxy `/api` на фронте).
- Уже есть: `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `JWT_*_SECRET`, `NODE_ENV`.

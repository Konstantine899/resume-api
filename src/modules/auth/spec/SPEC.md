---
status: approved
created: 2026-10-25
epic: backend-platform
step: 3
pair: TODO.md
---

> auto-mode: утверждено на основании §4 Шаг 3 плана `plan_backend_platform.md`
> (статус approved у владельца 2026-10-23, исполнение в auto-режиме).

# Auth — контракт модуля (Шаг 3 плана backend-платформы)

Единственная копия контракта. Критерии — наблюдаемые исходы; каждый размечен
слоем (domain / application / infrastructure / presentation), в котором
наблюдаемость закрепляется тестом. Код не пишется до фиксации этой секции.

## 1. Доменная модель

### 1.1 Агрегат `RefreshSession` (domain)

Агрегат-корень auth-контекста. Состояние персистится в Prisma
(`RefreshSession`), но инварианты ротации и отзыва живут ТОЛЬКО в методах
агрегата (`src/modules/auth/domain/`): БД — носитель состояния, не источник
правил. Prisma-модель хранит ТОЛЬКО SHA-256 hex токена; сырой refresh-токен
отсутствует и в агрегате, и в БД, и в логах (C14).

Свойства: `id` (uuid), `familyId` (VO `TokenFamily`), `userId`, `deviceId`
(VO), `tokenHash` (SHA-256 hex), `status`, `expiresAt`, `createdAt`,
`usedAt?`, `revokedAt?`, `revokedReason?`.

Состояния: `active` → `used` (ротация) / `revoked` (отзыв);
`used` → `revoked` (reuse-детект); `revoked` — терминальное.

Инварианты (методы агрегата, покрываются unit-тестами):

- **I1 — ротация:** `rotate(now)` допустим только из `active` и только пока
  `expiresAt > now`; переводит в `used`, выставляет `usedAt`, поднимает
  `TokenRotated`. Новый токен создаётся фабрикой `RefreshSession.issue(...)`
  в ТОЙ ЖЕ семье (application сохраняет обе сессии).
- **I2 — отзыв:** `revoke(reason, now)` из любого состояния; повторный вызов —
  no-op (идемпотентно); из `revoked` не выйти; поднимает
  `TokenFamilyRevoked` (по одному событию на сессию — потребитель
  application-слоя дедуплицирует по `familyId`, см. 1.3).
- **I3 — expiry:** предъявление протухшей `active`-сессии → отказ (не
  ротация): application отзывает ВСЮ семью (`reason: 'expired'`) и отвечает 401.
- **I4 — reuse → revoke всей семьи:** предъявление сессии в состоянии `used`
  → ВСЕ сессии семьи (включая предъявленную) переходят в `revoked` с
  `revokedReason: 'reuse'`; семья мертва: последующее предъявление любой
  сессии семьи → 401.

Гонка параллельных refresh одного токена закрывается условным переходом
`active → used` в репозитории (`updateMany` по `id + status`): проигравший
запрос получает отказ как при reuse (семья отзывается).

### 1.2 Value objects (domain)

- `TokenFamily` — uuid, генерируется при логине. **Одна активная семья на
  устройство:** логин с `deviceId`, у которого уже есть активная семья
  этого пользователя, ревокит старую семью (`reason: 'replaced'`) перед
  выпуском новой (C17).
- `deviceId` — строка 1–64, символы `[A-Za-z0-9_-]`; приходит от клиента в
  теле login **опционально**; отсутствие → сервер генерирует uuid (contract
  устойчив к клиенту, который ещё не передаёт deviceId).

### 1.3 Доменные события (domain/events, потребляет application)

- `TokenRotated` — { `sessionId`, `familyId`, `userId`, `rotatedAt` } —
  поднимается агрегатом при успешной ротации (I1).
- `TokenFamilyRevoked` — { `familyId`, `userId`, `reason`
  (`reuse | logout | replaced | expired`), `revokedAt` } — поднимается при
  отзыве сессии (I2/I4); потребитель логирует ОДИН раз на семью (дедуп по
  `familyId` внутри use-case).

Потребление: application логирует через `Logger`. В логи НИКОГДА не попадают
токены, хеши токенов и пароли — только идентификаторы.

### 1.4 Агрегат `User` (контекст users — см. `../users/spec/SPEC.md`)

auth владеет credentials-СЕМАНТИКОЙ (верификация argon2id, generic-ошибки
логина) и сессиями; физическое владение записью User — за контекстом `users`.
auth обращается к пользователю ТОЛЬКО через application-фасад
`UserAccountsService` (кросс-контекстный интеграционный слой), не читая
таблицу `User` напрямую и не импортируя домен `users`.

## 2. Наблюдаемые критерии

| #   | Критерий                                                                                                                                                                                                                                                | Слой                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| C1  | `POST /auth/login` с валидными креденшелами → 200 `{ accessToken, tokenType: 'Bearer', expiresIn: 900 }` (JWT `sub`, `role`, `typ: 'access'`, TTL 15m) + `Set-Cookie` refresh; access-токена в cookie и в localStorage — нет                            | application + presentation                      |
| C2  | Логин с неверным паролем и логин с несуществующим юзером → ТОТИЧНО одинаковые статус и тело `{ statusCode: 401, message: 'Invalid credentials' }`; отсутствие юзера не выводится из ответа                                                              | application (generic-ошибка) + presentation     |
| C3  | 1–5-я неудачная попытка логина (один IP+login, окно 60 c) → 401; **6-я → 429**; ответы 401 неотличимы по телу от C2                                                                                                                                     | infrastructure (throttler, tracker `ip+login`)  |
| C4  | `POST /auth/refresh` только с refresh-cookie (access НЕ требуется — он может быть истёк) → ротация: старый статус `used`, новый токен в ту же семью, новый cookie + новый access, 200                                                                   | domain (I1) + application                       |
| C5  | Refresh с reuse уже `used`-токена → 401 generic; ВСЯ семья `revoked` (`reason='reuse'`); последующий refresh ЛЮБОЙ сессией этой семьи → 401 (семья мертва)                                                                                              | domain (I4) + application                       |
| C6  | Refresh с неизвестным / протухшим / отозванным токеном → 401 generic `{ statusCode: 401, message: 'Invalid session' }`; протухшая активная семья → семья отзывается (`expired`)                                                                         | domain (I3) + application                       |
| C7  | `POST /auth/refresh` без cookie → 401 generic                                                                                                                                                                                                           | presentation                                    |
| C8  | `POST /auth/logout` → семья по предъявленному токену `revoked` (`reason='logout'`), cookie очищен (`Max-Age=0`), 204; logout без cookie → тоже 204 (идемпотентно)                                                                                       | application + presentation                      |
| C9  | Cookie refresh: `HttpOnly`, `SameSite=Lax` (всегда), `Secure` (всегда — на http://localhost браузеры его принимают), `Path=COOKIE_PATH` (дефолт `/auth`, покрывает refresh+logout), `Max-Age` = 30 d                                                    | presentation (cookie-билдер)                    |
| C10 | `POST /auth/refresh` с чужим `Origin` → 403; `Sec-Fetch-Site: cross-site` → 403; отсутствие обоих заголовков (не-браузерный клиент, supertest) → допускается (defense in depth поверх SameSite=Lax)                                                     | presentation (Origin-guard)                     |
| C11 | CORS: ровно origin из `FRONTEND_ORIGIN` + `credentials: true`; ответ на запрос с чужим origin не содержит `Access-Control-Allow-Origin`; preflight с разрешённым origin → ACAO присутствует                                                             | presentation (enableCors)                       |
| C12 | Публичной регистрации НЕТ: `POST /auth/register` (и любой users-read) → 404; единственный способ создать юзера — `npm run seed:admin` из env `ADMIN_EMAIL`/`ADMIN_PASSWORD` (idempotent upsert)                                                         | presentation (нет маршрута) + users/application |
| C13 | argon2id: OWASP-профиль `m=19456 KiB, t=2, p=1` — константами infrastructure РЯДОМ с функцией хеширования; тест-вектор: PHC-строка имеет префикс `$argon2id$v=19$m=19456,t=2,p=1$` и проходит verify-roundtrip (верный пароль → true, неверный → false) | infrastructure                                  |
| C14 | В БД refresh-сессии лежит ТОЛЬКО SHA-256 hex токена; сырой токен не персистится и не логируется ни на одном слое                                                                                                                                        | domain + application + infrastructure           |
| C15 | Throttler глобально 100/мин (per route+IP); `/auth/*` жёстче: 5/мин, tracker = IP+login (`@nestjs/throttler`)                                                                                                                                           | infrastructure                                  |
| C16 | `GET /auth/me`: без `Authorization` / с битым или истёкшим токеном → 401 generic; с валидным access → 200 `{ id, email, role }`                                                                                                                         | presentation (JwtAuthGuard) + application       |
| C17 | Повторный логин с тем же `deviceId` у того же пользователя ревокит старую активную семью (`reason='replaced'`); старый refresh-cookie → 401                                                                                                             | domain + application                            |
| C18 | Доменные события `TokenRotated` / `TokenFamilyRevoked` логируются application-слоем; в логах только id, без токенов/хешей/паролей                                                                                                                       | application                                     |

### Границы (НЕ в этом шаге)

- Контентные write-эндпоинты и RFC 9457-оформление ошибок — Шаг 4.
- password-reset (OPEN-A2) — out of scope; потеря пароля = ручное
  восстановление через БД.
- Публичные users-read-эндпоинты — отсутствуют.
- RolesGuard (403 для не-admin) — появляется в Шаге 4 на контентных
  write-эндпоинтах; в JWT уже заложено поле `role`.

## 3. Слои и зависимости (направление — только кнутрь)

```
domain/           — агрегат RefreshSession, VO TokenFamily/deviceId, события,
                    порты (SessionRepository, PasswordHasher, TokenHasher,
                    AccessTokenIssuer, Clock). Без NestJS/Prisma/HTTP/zod.
application/      — use-cases login/refresh/logout/me, generic-ошибки,
                    потребление событий. Без HTTP-объектов и zod.
infrastructure/   — Prisma-репозиторий сессий, argon2id (OWASP-константы),
                    SHA-256, JWT-issuer, системные часы, throttler-guard.
presentation/     — контроллер, zod-DTO (defense in depth), cookie-билдер,
                    Origin-guard, JwtAuthGuard, CORS.
auth.module.ts    — composition root (DI; все constructor-зависимости —
                    явный @Inject/useFactory, т.к. Vitest/esbuild не эмитит
                    design:paramtypes).
```

## 4. Env (добавляется к уже имеющимся из Шага 2)

- `FRONTEND_ORIGIN` — единственный разрешённый CORS-origin (дефолт
  `http://localhost:5173`).
- `COOKIE_PATH` — path refresh-cookie, дефолт `/auth`; при работе через
  vite-proxy `/api` выставляется `/api/auth` (браузер сравнивает путь до
  проксирования).
- `ADMIN_EMAIL` (валидный email) и `ADMIN_PASSWORD` (min 12) — обязательные
  поля zod-схемы; используются только `seed:admin`.
- Константы (не env): access TTL 15 m, refresh TTL 30 d, throttler 5/мин и
  100/мин, argon2id-профиль.

## 5. Структура спеки/реализации

- Пара спек: `src/modules/auth/spec/SPEC.md` (эта) + `TODO.md` (сгорает).
- Парная краткая спека контекста: `src/modules/users/spec/SPEC.md`.

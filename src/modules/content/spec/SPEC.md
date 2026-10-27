---
status: approved
created: 2026-10-25
epic: backend-platform
step: 4
pair: TODO.md
---

# Content — доменная модель content-модулей (Step 4 backend platform)

## 1. Домен и агрегаты

Context `content` владеет агрегатами контентных модулей: `AboutContent`, `ContactContent`,
`Project`, `SkillCategory`, `Job`, `Technology`. Domain-слой не зависит от NestJS, Prisma,
HTTP, zod. Prisma живёт только в `infrastructure/`.

### Value objects

- `LocalizedText` — пара локалей `{ en, ru }`, обе непустые (I1).
- `SafeSvg` — строка SVG без `<script`, обработчиков `on*` и `javascript:` (I2).

### Инварианты агрегатов

- About: `fullName` 2..80; descriptions localized 1..600; stats/statLabels keys 1..40,
  значения 1..60; ctaLabel nullable localized 1..40; portrait опционально 1..260.
- Contact: email валиден; texts/formTexts records с ключами 1..64 и localized 1..600/1..120;
  socialLinks с name 1..48, href https URL 1..2048.
- Project: title '' или 2..100; description localized <=600; techIcons <=20; featured boolean;
  role обе локали, если присутствует; metrics <=40; year 2000..2100.
- SkillCategory: category из фиксированного набора; categoryName 3..50; Technology name 2..30;
  technologies uniqueness по name; categories uniqueness по category.
- Job: company 2..80; position localized 3..100; period non-empty; startDate ≤? parseable;
  endDate nullable; description lists 1..6 bullets <=200; technologies <=15; location 2..80;
  current boolean; employmentType/level из enum.
- Technology: key slug `a-z0-9` с дефисами; url https или `/images/...`; invertInDark optional.

### Событие

- `ContentUpdated` — `{ aggregate: string; id: string; action: 'create'|'update'|'delete'; occurredAt: Date }`.

## 2. Наблюдаемые критерии

- Write-эндпоинты 100% защищены JwtAuthGuard → 401, не-admin → 403 (RolesGuard).
- SiteSettings: `GET /site/settings` публичный (возвращает `resumeUrl`), `PATCH /site/settings` admin-only и обновляет `resumeUrl`.
- Ошибки в RFC 9457 problem+json; Prisma P2002 → 409, P2025 → 404 (backstop).
- Upload-политика: magic bytes, ≤5MB, UUID, web-root, content-type, no directory listing.
- SafeSvg блокирует stored XSS (reject `<svg onload=...>`).
- Dry-run импорта возвращает diff без записи; успешный импорт — отдельное подтверждение.

## 3. Д layers

- domain/ — VO + aggregates + repository interfaces (no Prisma/HTTP/zod)
- application/ — Commands + use cases create/update/delete/find + dry-run ACL stubs
- infrastructure/ — Prisma adapters (mapping only)
- presentation/ — controllers with DTO parse only, guards

## 4. Матрица статусов

- 401 без/неверный access token.
- 403 не-admin роль.
- 409 конфликт уникальности.
- 429 throttle (если применимо).

## 5. Out of scope для блока

- Полноценный API transform, e2e Step 4, OpenAPI polish.
- Реальные загрузки файлов/импорт ACL beyond stubs.

---

## Amendment — Contact CRM ingestion (`plan-contact-crm.md`, 2026-10-27)

Scope: public `POST /contact/messages` with DB persistence, throttling, RFC7807, inbound storage only.

### Новые наблюдаемые критерии

- `POST /contact/messages` returns `201 Created` with `{ id }`.
- payload:
  - `email`: valid email
  - `subject?`: 1..120 (optional)
  - `body`: 1..2000 (required)
  - `source?`: optional 1..64
  - `locale?`: `'en' | 'ru'`
- invalid body => 400/422 RFC problem+json
- 6-я попытка (throttler) => 429
- Prisma mapping только через repository (`ContactMessage` aggregate)
- новая сообщение `status` стартует `NEW`
- storage only transactional, no sensitive logging
- OpenAPI drift fixed in frontend snapshot

---

## Amendment 4-6 — Contact CRM hardening (2026-10-27)

### Data and PII

- model `ContactMessage` (NEW): email, optional subject, required body, optional source, optional locale, status, timestamps
- no `submitIpHash`; no raw IP persisted
- email preserves local part casing, trim + domain lowercase
- `subject <=120`, `body <=2000`, `source <=64`, `locale in {en,ru}`
- payload max `8KB` enforced before JSON parsing
- archive/anonymize after TTL: `email`, `subject`, `body`; coarse metadata only (`status`, `source`, `locale`, `createdAt`)

### API and RFC7807

- `POST /contact/messages`
- `201` `{id}`
- `400` malformed payload
- `422` semantic validation
- `429` + `Retry-After`
- `413` on oversized body
- `503` generic problem+json on backend failure
- errors include `correlationId`, no internals
- no CRM/admin endpoints in Phase 3 MVP

### Throttling and proxy

- per IP: 10/min, 100/day
- per email-hash: 5/h (email normalized)
- honeypot `website` -> `202`, no DB write
- proxy policy must document trusted upstream subnet
- runtime limiter in-memory only; no cluster abstraction in MVP

### Security

- CORS exact `FRONTEND_ORIGIN`
- `content/chat` renders plaintext only (`no dangerouslySetInnerHTML`)
- body/message is opaque, no markup semantics
- outbound notifications not in Phase 3
- EmailJS direct removal after parity/staging green check

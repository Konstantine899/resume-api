---
status: approved
epic: about-admin-sections
created: '2026-11-01'
spec: 1
---

# SPEC — modules/content (backend-контракт `stack`, эпик `about-admin-sections`)

> Единственная истина backend-части эпика `about-admin-sections`.
> Статусы: `draft` → `approved` → `done`. Источник: vault
> `about-admin-sections-refactor.md` rev.2. Исторические эпики пары
> (`about-only-cache-sync`, SiteSettings) сохранены в git — их контракты
> здесь не дублируются. Companion: [TODO.md](./TODO.md). Язык: русский.

## Цель

PUT/GET `/about` learns the optional `stack` field end-to-end: Zod →
aggregate → Prisma `Json?` → repository/DTO → ответ. Контракт
additive/optional: старые документы читаются и пишутся без миграции данных.

## Решения

- **B-1 — `aboutUpsertSchema` += `stack`**: `z.array(slugKey).min(0).
max(20).optional()`; `slugKey` = тот же slug-regex, что у
  `technologyUpsertSchema.key`. Схема остаётся `.strict()` — новые поля
  вводятся ТОЛЬКО additive.
- **B-2 — порядок деплоя (дыра C5)**: `.strict()` означает, что старый
  backend отклонит запрос со `stack`. Релиз строго **backend → frontend**
  (WU-1 до WU-2..5); деплой frontend-раньше backend запрещён.
- **B-3 — Prisma**: `AboutContent.stack Json?` + `npx prisma migrate
dev` (additive, без backfill — expand-and-contract); никогда
  `prisma db push` на shared/production.
- **B-4 — aggregate**: `domain/aggregates.ts` += `stack` (getter +
  applyUpdate, по образцу `portrait`).
- **B-5 — репозиторий/DTO-адаптер (дыра C4)**: маппинг `Json? → DTO` в
  infrastructure; отсутствие поля в БД → `undefined` в DTO (не `[]`).
- **B-6 — e2e**: happy-path GET/PUT round-trip `stack` (порядок
  сохраняется), отказ не-slug ключа и `length > 20` (400, RFC 7807),
  документ без поля → legacy-совместимость (поле отсутствует в ответе),
  `stack: []` сохраняется как `[]`.
- **B-7 — 409 не меняется**: `expectedUpdatedAt`-контракт и форма
  конфликта существующие; новая UX-стратегия конфликта (вердикт OPEN-5)
  живёт на фронте и backend не трогает.

## Контракт (наблюдаемое поведение)

- PUT `/about` со `stack: ['react']` → 200, документ содержит поле.
- PUT без `stack` → 200, существующее значение сохраняется как
  отсутствие (additive-семантика полного replace: поле отсутствует =
  `undefined`, не очистка — проверить фактическую full-replace-семантику
  и зафиксировать в тесте).
- Не-slug / >20 элементов → 400 RFC 7807, состояние не изменилось.
- GET legacy-документа → payload без `stack` (фронт резолвит fallback).

## Критерии готовности

- [ ] `aboutUpsertSchema`: optional `stack`, slug-regex, кап 20;
      `.strict()` сохранён (тесты на отказ не-slug и >20).
- [ ] Prisma-миграция `stack Json?` применена локально;
      `npm run prisma:generate` после правки schema.
- [ ] Aggregate + репозиторий/DTO: поле проходит round-trip, отсутствие →
      `undefined` (тесты).
- [ ] e2e: happy-path, 400 на не-slug/>20, legacy без поля, `stack: []`
      round-trip.
- [ ] `npm run validate` backend (type-check + lint + format:check + test + test:e2e + build) зелёный. (У backend НЕТ `check:spec` — гейт
      спек существует только во frontend-сканере.)
- [ ] Порядок релиза задокументирован в PR (backend до frontend).

## Вне скоупа

- Frontend-контракт и UI — пары `entities/AboutContent` и
  `features/AdminAbout`.
- `PROFILE_STACK`/`SkillsCode` — не трогаются.
- Изменение 409-протокола, SiteSettings, media-очистка — не трогаются.

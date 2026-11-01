---
status: approved
epic: about-admin-sections
created: '2026-11-01'
spec: SPEC.md
---

# TODO — modules/content (backend `stack`)

> План к [SPEC.md](./SPEC.md) (approved). Пункты сгорают удалением.

## WU

- [ ] **WU-1 — backend stack** (ветка `feat/about-stack-contract`,
      отрезается от `dev`; ДО фронтенд-работ): - `content.schemas.ts`: `aboutUpsertSchema` += optional `stack`
      (slug-regex, min 0, max 20); - `prisma/schema.prisma`: `AboutContent.stack Json?` +
      `npx prisma migrate dev` + `npm run prisma:generate`; - `domain/aggregates.ts`: getter + applyUpdate; - infrastructure: репозиторий/DTO-адаптер (отсутствие →
      `undefined`); - e2e: round-trip, отказы 400 RFC 7807, legacy-совместимость,
      `stack: []`.
- [ ] Гейты: `npm run validate` (нужен PostgreSQL `resume_api_test`);
      `gh pr create --base dev` DRAFT, squash после зелёных чеков.
      (Backend-сканера `check:spec` нет — спек-гейт действует только во
      frontend.)

## Порядок

- WU-1 (backend) → WU-2 (frontend контракт) → остальные. Релиз:
  backend → frontend (SPEC B-2).

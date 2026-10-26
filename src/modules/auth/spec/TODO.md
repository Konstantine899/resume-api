---
status: approved
created: 2026-10-25
epic: backend-platform
step: 3
spec: SPEC.md
---

# TODO — Шаг 3: auth (план сгорает по мере работы; выполненный пункт удаляется)

Чек-лист = 7 критериев security-ревью плана (§4 Шаг 3) + структура SPEC-driven.
Каждый пункт → пункт реализации; статус пары: `approved` → `done` после гейта.

- [ ] S-0. Структура: ветка `feat/step3-auth` от `dev`; пара спек
      `src/modules/auth/spec/` + `src/modules/users/spec/`; PR `--base dev`
      после зелёного гейта (conventional commits, DRAFT-конвенция не требуется
      в auto-режиме).
- [ ] S-1. **argon2id-параметры закреплены:** `@node-rs/argon2`,
      OWASP-профиль `m=19456 KiB, t=2, p=1` константами infrastructure рядом с
      хешем; параметры лежат в PHC-строке рядом с хешем; тест-вектор на
      стабильность (префикс PHC + verify roundtrip). → SPEC C13, unit-тесты.
- [ ] S-2. **Refresh-токены:** Prisma `User` + `RefreshSession` (хранить ТОЛЬКО
      SHA-256 + familyId + userId + deviceId + срок + состояние), миграция
      `prisma migrate dev`; доменная модель `RefreshSession`
      (active/used/revoked), VO `TokenFamily`/`deviceId`, инвариант
      «reuse → revoke всей семьи», события `TokenRotated`/`TokenFamilyRevoked`;
      ротация помечает старый used и выдаёт новый. → SPEC 1.1–1.3, C4–C6,
      C14, C17; unit + e2e.
- [ ] S-3. **Cookie-флаги и CSRF:** access 15m только в ответе (не cookie, не
      localStorage); refresh — httpOnly cookie `SameSite=Lax; Secure`
      (комментарий про supertest/Secure), path = `COOKIE_PATH`; Origin/
      `Sec-Fetch-Site` guard на `/auth/refresh` (defense in depth);
      кросс-доменный профиль НЕ применяется. → SPEC C1, C9, C10; unit + e2e.
- [ ] S-4. **Brute force:** `@nestjs/throttler` глобально (100/мин) + жёстче
      на `/auth/*` (5/мин per IP+login, явный tracker), 6-я попытка → 429. →
      SPEC C3, C15; e2e (6 неудачных логинов).
- [ ] S-5. **Публичная регистрация (env-gated):** `POST /auth/register`
      активен при `ALLOW_PUBLIC_REGISTRATION` unset/`true`, возвращает 404 при
      `false`; выпускает только `USER`; CLI-сид `seed:admin` остаётся
      единственным способом создания `ADMIN`. → SPEC C12/C19–C24; e2e seed.
- [ ] S-6. **CORS-allowlist:** origin фронта из `FRONTEND_ORIGIN` +
      `credentials: true`; чужой origin → denied (нет ACAO). → SPEC C11; e2e.
- [ ] S-7. **Ошибки generic:** 401-тела неотличимы для «нет юзера» и
      «неверный пароль» (C2), generic 401 для refresh (C6/C7); password-reset
      НЕ делаем (out of scope). → e2e + unit.
- [ ] S-8. Env: zod-схема `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
      `FRONTEND_ORIGIN`, `COOKIE_PATH` + тесты; `.env.example` + CI-env.
- [ ] S-9. Модуль `users` (границы §2): агрегат User (роль admin), порт +
      Prisma-реализация, application-фасад для auth, без публичных
      HTTP-эндпоинтов. → `src/modules/users/spec/SPEC.md`.
- [ ] S-10. Гейт: `npm run validate` → exit 0 (unit + e2e), CI
      `prisma migrate deploy` перед тестами; PR → зелёный `validate` →
      squash-merge + delete-branch → dev обновлён.

---
status: approved
created: 2026-10-23
spec: SPEC.md
epic: backend-step3-auth
---

# TODO — Шаг 3: auth (план сгорает по мере работы)

- [ ] WU-1: ветка `feat/auth` от `dev`, DRAFT PR
- [ ] WU-2: пара спек `src/modules/auth/spec/` (SPEC → TODO), status: approved
- [ ] WU-3: Prisma-модели `User` + `RefreshSession` (enum role/status, индексы
      familyId/deviceId), миграция `prisma migrate dev`
- [ ] WU-4: domain — агрегат RefreshSession (I1–I4), VO TokenFamily/deviceId,
      события TokenRotated/TokenFamilyRevoked, порты; unit-тесты агрегата
- [ ] WU-5: users-модуль — агрегат User (email, password ≥12), порт +
      Prisma-реализация
- [ ] WU-6: infrastructure auth — argon2id OWASP-константы (C13, PHC-тест),
      JWT-issuer (sub/role/jti), SHA-256 токен-хеширование, часы,
      Prisma-репозиторий сессий
- [ ] WU-7: env — `CORS_ORIGINS`, `COOKIE_PATH` + тесты
- [ ] WU-8: application — login/refresh/logout use-cases, generic 401 (C2/C7),
      reuse → revoke семьи (C5), ротация (C4), rotation binding (C6),
      логирование доменных событий без токенов
- [ ] WU-9: presentation — контроллер + zod-DTO, cookie-билдер (C9),
      Origin-guard на refresh (C10), CORS allowlist (C11/C16),
      throttler глобально 100/мин + auth-guard 5/мин ip+login (C3/C15),
      отсутствие register (C12)
- [ ] WU-10: seed:admin CLI (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, ≥12, idempotent,
      `--force`)
- [ ] WU-11: e2e — цикл login→refresh→reuse→401+revoke→мёртвая семья;
      6-й логин → 429; идентичные 401-тела; logout → revoke; чужой Origin → 403;
      CORS preflight; register → 404; cookie-флаги
- [ ] WU-12: CI — `prisma migrate deploy` перед `test:e2e`
- [ ] WU-13: гейты (validate, build, test:e2e), push, DRAFT→ready,
      squash-merge + delete-branch, CI на dev; готчи в AGENTS.md

---
status: approved
created: 2026-10-29
epic: media-pipeline
spec: SPEC.md
---

# TODO — modules/media: PR-1a (план сгорает по мере работы; выполненный пункт удаляется)

Чек-лист = WU-1 + WU-2 плана `plan-image-pipeline-migration.md` (§0 auto-режим,
approved 2026-10-29). Каждый пункт → пункт реализации; статус пары:
`approved` → `done` после зелёного `npm run validate` и merge PR-1a в `dev`.

## WU-1 — домен и инфраструктура

- [ ] M-0. Структура: ветка `feat/media-pipeline-pr1a` от `dev`; модуль
      `src/modules/media/` (`domain/`, `infrastructure/`, `presentation/`);
      `sharp` зафиксирован в lockfile; PR `--base dev`.
- [ ] M-1. `domain/media-key.ts`: `uuid.ext` + варианты `uuid-<320|640|960>.webp`;
      парсер ключа с allowlist (только 36-hex uuid, расширения
      `png|webp|avif|svg`, ширины `320|640|960`); всё прочее → null.
      → SPEC §2, unit.
- [ ] M-2. `domain/ports.ts`: порты `MediaStorage` (put/get/delete/exists/writable,
      `stat`) и `MediaProcessor` (`process(input, kind)` → base + variants).
      Domain без NestJS/Prisma/HTTP/sharp. → SPEC §1, unit (типы).
- [ ] M-3. `infrastructure/local-disk.storage.ts`: root из `UPLOADS_DIR`;
      атомарная запись `tmp → rename` (0644), tmp удаляется при любой ошибке;
      ENOSPC → 507, EACCES/EPERM → 403; `writable()` — пробный файл.
      → SPEC §4, unit.
- [ ] M-4. `infrastructure/sharp.processor.ts`: `sharp@0.35.5`, magic bytes →
      `rotate()` → `limitInputPixels` 25 MP → strip EXIF/XMP → base + варианты
      320/640/960 WebP q82; concurrency 1–2 + очередь модуля; неподдерживаемый
      формат → 415, превышение пикселей/повреждение → 400; min width portraita
      960; icon ≤512 без вариантов; SVG → `SafeSvg` без sharp. → SPEC §3, unit.
- [ ] M-5. `config/env.ts`: `UPLOADS_DIR` (default `uploads`), в
      `NODE_ENV=production` — обязателен абсолютный путь; тесты схемы.
- [ ] M-6. `create-app.ts`: создание каталога до `app.listen`; readiness
      проверяет `MediaStorage.writable()`; read-only root → readiness false.
      → SPEC §4, e2e.

## WU-2 — HTTP-контракт

- [ ] M-7. `POST /media?kind=portrait|icon`: Admin (JWT + RolesGuard),
      multipart 5 MB; 201 `{ key, width, height, variants: [{ width, key }] }`;
      400/413/415/507 по SPEC §5. → e2e.
- [ ] M-8. `GET /media/:key`: public; allowlist; MIME из содержимого;
      `Cache-Control: public, max-age=31536000, immutable`, `ETag`, `nosniff`;
      SVG → `SafeSvg` + `CSP: default-src 'none'; sandbox`; 404 для отсутствующих
      и ширин вне набора; traversal → 404. → e2e.
- [ ] M-9. `DELETE /media/:key`: Admin, best-effort, удаляет базу и варианты;
      ключ ещё в документе → 409 без удаления; удаление не блокирует ответ.
      → SPEC §5, e2e.
- [ ] M-10. `/images/*` compat shim: GET/DELETE делегируют в media; POST
      выводит `kind` из MIME (SVG → icon, растр → portrait) и возвращает
      `{ url: '/images/<key>', filename }`. → SPEC §5, e2e.
- [ ] M-11. `media.module.ts`: wiring портов на адаптеры, регистрация
      контроллеров, удаление `/images` из content-модуля.
- [ ] M-12. Гейт: `npm run validate` → exit 0 (type-check, lint, format,
      unit, e2e, build). PR-1a → зелёный CI → squash-merge в `dev` +
      delete-branch; пара → `status: done`.

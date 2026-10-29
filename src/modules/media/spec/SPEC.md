---
status: approved
created: 2026-10-29
epic: media-pipeline
pair: TODO.md
---

> auto-mode: утверждено на основании §0 плана
> `wiki/plan/todo/plan-image-pipeline-migration.md` (status `ready`, approved 2026-10-29).

# SPEC — modules/media (контракт медиа-пайплайна, PR-1a)

Единственная копия контракта модуля. Критерии — наблюдаемые исходы; каждый
размечен слоем (domain / infrastructure / presentation), в котором
наблюдаемость закрепляется тестом. Код не пишется до фиксации этой секции.

## 1. Границы модуля

- Новый `src/modules/media/` по гексагональному шаблону `content`:
  `domain/ports.ts`, `domain/media-key.ts`, `infrastructure/local-disk.storage.ts`,
  `infrastructure/sharp.processor.ts`, `presentation/media.controller.ts`,
  `media.module.ts`.
- Domain не зависит от NestJS, Prisma, HTTP и `sharp`.
- `MediaStorage` и `MediaProcessor` — порты; адаптеры заменяемы (S3/R2 позже).

## 2. Ключи и варианты

- База: `<uuid>.<ext>`, плоский ключ без подкаталогов (D1, D2).
- Новые растровые загрузки сохраняются как WebP (`.webp`); SVG-иконка — `.svg`.
- Варианты: `<uuid>-<width>.webp`, ширины строго `320 | 640 | 960` (D5).
- Варианты всегда WebP, даже если база `.png` (legacy).
- В документе хранится **только база**; вариант не может быть значением документа.
- База — нативная ширина; для новых загрузок cap 1920. Новый `kind=portrait`:
  минимальная ширина источника 960, иначе 400. Апскейл новых загрузок запрещён.
- `kind=icon`: вариантов нет; SVG после `SafeSvg`; растровые иконки ре-энкодятся
  в WebP, max 512 px.
- In-place перекодирование запрещено: изменение параметров энкода = новый uuid (D11).

## 3. Обработка (`MediaProcessor`)

- `sharp` 0.35.5 (точная версия в lockfile), prebuilt-бинарники.
- Порядок: magic bytes → `rotate()` (auto-orient) → `limitInputPixels` 25 MP →
  strip EXIF/XMP → base + варианты → WebP q82.
- `sharp` concurrency 1–2; очередь на уровне модуля.
- Ошибки: неподдерживаемый формат → 415; превышение пикселей → 400;
  повреждённый файл → 400; нет места → 507.

## 4. Хранилище (`MediaStorage`)

- `LocalDiskStorage`: root из `UPLOADS_DIR`; атомарная запись `tmp → rename`, 0644.
- `UPLOADS_DIR` в `NODE_ENV=production` обязан быть абсолютным; каталог создаётся
  до `app.listen`; readiness проверяет запись пробным файлом.
- ENOSPC → 507 + error-лог; EACCES/EPERM → 403; удаление tmp при любой ошибке.
- Одна реплика на локальном диске (D13); >1 реплика требует S3/R2 до масштабирования.

## 5. HTTP-контракт

### POST `/media?kind=portrait|icon`

- Admin (JWT + RolesGuard), multipart `file`, 5 MB.
- `portrait`: PNG/WebP/GIF/AVIF (что декодирует сборка `sharp`), min width 960,
  SVG отклоняется; `icon`: SVG после `SafeSvg` или растр ≤512 px.
- 201: `{ key, width, height, variants: [{ width, key }] }`; для `icon` — `variants: []`.
- 400 (формат/ширина/svg-policy), 413 (размер), 415 (MIME), 507 (нет места).

### GET `/media/:key`

- Public.
- Allowlist: `<uuid>.{png,webp,avif,svg}` и `<uuid>-{320,640,960}.webp`;
  `jpg|jpeg|gif` читаются только как legacy (D10) и новых ключей не создают.
- MIME — из фактического содержимого, не из расширения.
- Заголовки: `Cache-Control: public, max-age=31536000, immutable`, `ETag`,
  `X-Content-Type-Options: nosniff`.
- SVG: повторная валидация `SafeSvg` + `Content-Security-Policy: default-src 'none'; sandbox`.
- 404 для отсутствующего файла и для ширин вне набора.

### DELETE `/media/:key`

- Admin, best-effort; удаляет базу и её варианты.
- Если ключ ещё указан в документе — 409, файл не удаляется.

### `/images/*` — compat shim (D9)

- `GET`/`DELETE` делегируют в media.
- `POST` принимает файл, выводит `kind` из MIME (SVG → icon, растр → portrait)
  и возвращает старый shape `{ url: '/images/<key>', filename }`.
- Удаление shim — только после отчёта миграции с 0 legacy-ссылок.

## 6. Инварианты

- Ключ не зависит от окружения; URL собирает клиент.
- Имя иммутабельно: байты под существующим ключом не меняются.
- Вариант не хранится в документе и не является ключом базы.
- Legacy-значения (`/...`, `http...`) обслуживаются shim до миграции.
- Все удаления best-effort и не блокируют ответ.

## 7. Вне scope PR-1a

- Frontend resolver и `uploadImage` (PR-1b).
- Скрипты миграции 5a/5b (PR-2a).
- Удаление shim (PR-3b).
- S3/R2, presigned upload, AVIF на выходе, медиа-реестр.

## 8. Критерии

Наблюдаемые критерии и гейты — в [TODO.md](./TODO.md). Статус пары:
`approved` → `done` после зелёных unit/e2e и merge PR-1a.

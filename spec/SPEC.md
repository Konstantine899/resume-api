---
status: draft
epic: backend-image-migration
created: 2026-10-28
mode: auto after SPEC
pair: TODO.md
---

# SPEC — backend image migration (`/images`, uploads)

## Scope

Owns server-side image ingestion, validation, storage, serving and orphan cleanup under `/images`.
Context / domain boundary: content portal module owns image persistence API and server-storage invariant.

## Contract and invariants

- `POST /images` is **admin-only** and protected by JwtAuthGuard + RolesGuard.
- `GET /images/:name` is **public**.
- `DELETE /images/:name` is **admin-only** and best-effort.
- Accepted types: PNG, JPEG, GIF, WEBP, SVG.
- MIME is determined server-side by magic bytes and content; client MIME/extension never trusted.
- Names are server-generated only (`^ ...$` UUID + allowed extension).
- Stored `URL/path` shape:
  - relative server transport path `/images/<uuid>.ext`
  - frontend persisted URL is constructed as `apiBase` + server path.
- SVG validation: backend `SafeSvg` authoritative; rejects script, foreignObject, `on*`, inline javascript/data/external links.
- `UPLOADS_DIR` is absolute persistent path, validated before startup, created with recursive mkdir.
- uploads write to temp then rename (atomic-ish), requested temp cleanup.
- `GET /images/:name`: revalidate forbidden names, MIME detected from bytes, no traversal.
- `POST` enforces ≤5MB strict.
- Maximum file complexity and size hard-coded server-side.
- `DELETE` only admin, best-effort, never blocks main action.
- Existing seeded `/images/projects/...` are not part of upload endpoint.

## Observed criteria

- Admin auth required on POST/DELETE → 401/403.
- Public GET `/images/:name` serves only allowed names.
- Server detection accepts magic bytes only.
- SVG `<svg><script>` is rejected with 400.
- oversized rejects 413.
- path traversal rejects 400.
- persistent file after process restart (if absolute `UPLOADS_DIR`).
- response includes safe headers: `X-Content-Type-Options: nosniff`.

## Auth and transport

- Auth via bearer token.
- URL returned is location, frontend resolves api base.
- Trusted proxy rules applied.

## Acceptance

- API tests show:
  - formats accepted and mime correct;
  - wrong MIME rejects 400;
  - traversal denied;
  - over-size 413;
  - SVG active-content rejected;
  - DELETE admin-only and 404 on missing;
  - storage persisted after restart.
- Infrastructure boot requires `UPLOADS_DIR` absolute.

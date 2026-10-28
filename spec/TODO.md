---
status: draft
epic: backend-image-migration
created: 2026-10-28
spec: SPEC.md
mode: auto after SPEC
---

# TODO — backend /images upload

1. API
   - [ ] `POST /images` controller scaffolding requires allowed role checks and multipart.
   - [ ] `GET /images/:name` runtime serving.
   - [ ] `DELETE /images/:name` admin-only.
   - [ ] Upload policy detection (PNG/JPEG/GIF/WEBP/SVG magic bytes + SafeSvg).

2. Storage and env
   - [ ] env `UPLOADS_DIR` absolute validation
   - [ ] create root at startup
   - [ ] UUID generation (enthalpy ext)
   - [ ] atomic temp-write + rename
   - [ ] `sendFile` resolved absolute path

3. Tests
   - [ ] PNG/JPEG/GIF/WEBP accepted
   - [ ] SVG accepted only when safe
   - [ ] XXE / XSS rejects
   - [ ] traversal name rejects
   - [ ] oversize 413
   - [ ] GET mime correct and nosniff
   - [ ] DELETE admin restricted

4. Gate
   - [ ] `type-check`
   - [ ] lint / lint-style
   - [ ] backend unit tests
   - [ ] build startup checks for `UPLOADS_DIR`

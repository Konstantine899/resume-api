# SPEC — About-only cache sync micro-slice (backend)

status: draft
epic: about-only-cache-sync
created: 2026-10-29

## Contract

- GET /about returns result.toProps() or null if no record.
- PUT /about accepts AboutUpsertCommand, validates via aboutUpsertSchema, executes UpsertAboutUseCase, returns result.content.toProps() (includes updatedAt and portrait path).
- Schema enforces required fields: fullName (2-80), descriptions array (≥1, each locale ≤600), stats record (keys 1-40, each locale ≤60), statLabels optional, ctaLabel nullable, portrait optional (1-260), updatedAt optional datetime.
- On success, response includes updatedAt and may include X-Replaced-Media-Key header.
- Mutation failure returns appropriate error (e.g., 400 validation, 500 server) and does not modify state.
- Authentication required for PUT (JwtAuthGuard + RolesGuard).
- No partial merge: full replace contract.
- id and updatedAt are backend-only metadata, not transmitted to frontend as state (stripped in App.tsx).

## Amendment — Remaining About sync fixes (sdd-session-2026-10-29-02, spec)

Formal specification: `.opencode/specs/sdd-session-2026-10-29-02/spec.md`.

- Frontend `App.tsx` must normalize `GET /about` payload by allow-listing only domain
  fields and validating with `AboutContentSchema.strict()`; transport metadata (`id`,
  `updatedAt`, `expectedUpdatedAt`) must not enter Redux.
- Mount-time load of `/about` is required; guarded by an in-flight promise ref.
- After every successful `PUT /about`, the frontend must advance the local document's
  `updatedAt` to the server-returned value to avoid false 409s.
- 409 responses carry `conflicts.currentUpdatedAt`; frontend should surface a conflict
  toast, advance the revision only, and preserve pending edits (no auto-refetch).
- Portrait upload is carried by `PUT /about` (single channel); `X-Replaced-Media-Key`
  cleanup stays wired in the RTK Query mutation's `onQueryStarted`.
- Multi-entity migration remains out of scope; About-only.

## Amendment — SiteSettings singleton (2026-10-30)

### Contract

- Endpoint: `GET /site/settings` (public), `PUT /site/settings` (admin-only).
- Storage: Prisma model `SiteSettings` table `SiteSettings` with:
  - `id` (text, PK, default `'singleton'`)
  - `resumeUrl` (text, nullable)
  - `createdAt` (timestamp, default now)
  - `updatedAt` (timestamp, auto-updated)
- GET response: `{ resumeUrl: string | null }`.
- PUT body: `{ resumeUrl?: string | null }`.
- Zod validation: `resumeUrl` trimmed, valid HTTPS URL or `null`; empty string invalid.
- Security: PUT requires `JwtAuthGuard` + `RolesGuard`; 401 without auth, 403 missing role.
- RFC 7807 error envelope for validation/authorization failures.
- Optimistic concurrency: not used (singleton document, last write wins). Reason:
  conflict probability is low and a full replace does not create structural merge risk.
- URL policy: HTTPS only. Reason: prevents mixed content/insecure download targets.

### Behaviour

- If record absent, GET returns `null`.
- PUT with `{}` keeps previous value (no update).
- PUT with `{ resumeUrl: null }` clears the field.
- Repository is the only Prisma access point.

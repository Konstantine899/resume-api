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

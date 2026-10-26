---
description: Run the full backend validation gate.
---

1. Start or confirm PostgreSQL on 5432 or 5433.
2. `npm run validate` (type-check, lint, format, unit, e2e, build).
3. Stop only if all checks pass.
4. Do not bypass failures silently.

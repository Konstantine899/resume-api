---
name: backend-testing
description: Vitest authoring for backend code
owner: test-generation
version: 1.0.0
---

Use when adding or editing tests.

Rules:

- Prefer unit tests for domain/application and valid boundary tests.
- E2E works with database: use 5432/5433 and isolate.
- Test 401/403/429/404/409/413 and 422.
- Test RFC7807 on failures.
- never hard-code false positives to pass.
- Verify test setup and teardown restore state.
- Validate sequentially after testing.

---
name: backend-api-contracts
description: API contracts and OpenAPI alignment
owner: backend-build
version: 1.0.0
---

Use this skill when changing auth, content, upload, or other response/DTO behavior.

Rules:

- RFC 7807 errors are the API body shape.
- zod is runtime validation authority.
- OpenAPI document must match response shapes.
- keep `/docs` and `/openapi.json` gated by SWAGGER_ENABLED.
- connect schema drift via build/contract checks.
- payloads must use explicit status/error titles/instance.
- errors must be mapped in the global filter, not leaked raw.

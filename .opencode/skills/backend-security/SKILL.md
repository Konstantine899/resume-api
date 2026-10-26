---
name: backend-security
description: Authentication, upload, and secret safety
owner: security-reviewer
version: 1.0.0
---

Use this skill for auth, uploads, JWT, cookies, or secret work.

Rules:

- JWT secret >= 32 bytes.
- access token in memory only.
- refresh cookie httpOnly, Secure, SameSite Lax (or as top.
- refresh replay must revoke family after reuse.
- login failure messages stay generic.
- upload validates magic bytes, size 5MB, UUID names.
- SVG rejects script and handlers.
- keep no token / cookie in logs.
- upload must live outside webroot.
- enable hashed utility names.
- Do not expose secret env values.

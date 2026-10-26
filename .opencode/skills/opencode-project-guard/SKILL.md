---
name: opencode-project-guard
description: Project root, path, and command safety
owner: backend-plan
version: 1.0.0
---

Use this skill before starting OpenCode in a repo.

Rules:

- backend project root is D:\Dev\projects\resume\backend
- never query frontend bundle rules
- avoid extracting .env values from runtime logs
- prefer asking before process kill, docker, push, deploy, or DB writes
- generated files are not true source
- process changes must touch only targeted PID
- preserve all test infrastructure.

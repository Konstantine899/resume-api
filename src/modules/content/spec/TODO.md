---
status: approved
created: 2026-10-25
epic: backend-platform
step: 4
spec: SPEC.md
---

# TODO — Step 4: content module skeleton

- [ ] S-0. SPEC+TODO утверждены.
- [ ] S-1. LocalizedText VO + тесты.
- [ ] S-2. SafeSvg VO + sanitize/validation тесты.
- [ ] S-3. Инварианты агрегатов.
- [ ] S-4. Ports репозиториев.
- [ ] S-5. Use cases create/update/delete/find + Commands + dry-run importer ACL stubs.
- [ ] S-6. Prisma adapters mapping.
- [ ] S-7. Controllers scaffold + DTO parse + auth guard + RBAC 403.
- [ ] S-8. Module wiring.
- [ ] S-9. Export JwtAuthGuard (готово в auth).
- [ ] S-10. Migration `content-aggregates` + generate + type-check/test.
- [ ] S-11. Block 2: полноценный API transform, OpenAPI, e2e.

---

# Amendment TODO — Contact CRM (2026-10-27)

- [ ] C-0. согласована pair spec/approved owner
- [ ] C-1. `ContactMessage` VO + domain invariants (email/body/subject/source/locale/status)
- [ ] C-2. ports repositories + command create message
- [ ] C-3. migration + `prisma:generate`
- [ ] C-4. POST controller + DTO parse + throttle/rate limit
- [ ] C-5. e2e submit + invalid + throttle
- [ ] C-6. RFC filter + log redaction
- [ ] C-7. Admin inbox plan deferred (Phase 4)
- [ ] C-8. dual-write vault + OpenAPI + frontend contracts update

---

# Amendment 4-6 TODO — Contact CRM (2026-10-27)

- [ ] H-0. owner sign-off for retention/legal baseline
- [ ] H-1. ContactMessage model/migration + repository ports
- [ ] H-2. POST controller + zod DTO + RFC filter
- [ ] H-3. proxy allowlist/CORS documentation and test
- [ ] H-4. honeypot and throttling tests (per-email + add proxy matrix)
- [ ] H-5. anonymize-age behavior documented, scheduled job deferred (Phase 4)
- [ ] H-6. restore test gate and DB-failure 503 assertions
- [ ] H-7. e2e submit/invalid/limiter/oversized/honeypot
- [ ] H-8. OpenAPI snapshot after endpoint/feature flag
- [ ] H-9. frontend form submit + success clear + RFC mapping
- [ ] H-10. text render/text-only contract + tests
- [ ] H-11. docs/vault dual-write

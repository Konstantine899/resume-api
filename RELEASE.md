# RELEASE.md

## Release steps

1. Confirm `npm run validate` is green.
2. Create and push `v0.1.x`.
3. GitHub release workflow:
   - build-and-push
   - migrate deploy when secret is set
4. Verify `GET /health/live` and `GET /health/ready`.
5. Seed admin if required.
6. Run restore-test on isolated DB.

## Hosting

- Reverse proxy terminates HTTPS.
- `SWAGGER_ENABLED=false` in production.
- `/openapi.json` is optional from deployed site if controlled URL is expected.
- Backup cron and uptime alert are mandatory operational steps.

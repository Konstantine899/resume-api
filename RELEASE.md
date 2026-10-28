# RELEASE.md

## Pre-release database backup

Before applying the Role enum migration (`20261026131406_add_role_user_and_default_user`), take a custom-format dump for rollback:

`pg_dump --format=custom --file=resume_api_pre_role_<date>.dump <DATABASE_URL>`

Rollback is restore-the-dump + redeploy previous build; never attempt to remove `USER` from the live enum. Migration is forward-only.

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

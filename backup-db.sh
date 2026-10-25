#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
OUT="${1:-backup-$(date +%Y%m%d-%H%M%S).sql.gz}"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges | gzip -c > "$OUT"
echo "wrote $OUT"
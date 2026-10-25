#!/usr/bin/env bash
set -euo pipefail
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
FILE="${1:?backup file path required}"
gzip -cd "$FILE" | pg_restore --dbname="$TARGET_DATABASE_URL" --clean --no-owner --no-privileges --if-exists
echo "restored $FILE"
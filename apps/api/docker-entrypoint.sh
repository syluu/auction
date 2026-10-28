#!/bin/sh
# Runs database migrations, optionally seeds demo data, then starts the API.
set -e
cd /app/apps/api
export CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
PRISMA=./node_modules/.bin/prisma

echo "[api] applying migrations"
$PRISMA migrate deploy

# The Prisma CLI resets the generated client when it runs; regenerate it (offline, engines are already in the image).
$PRISMA generate >/dev/null

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "[api] SEED_DEMO=true: loading demo campaign and users (skipped if already present)"
  node dist/prisma/seed.js
fi

echo "[api] starting"
exec node dist/src/main.js

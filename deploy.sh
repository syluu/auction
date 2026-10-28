#!/usr/bin/env bash
# One-command deploy of the auction stack with Docker Compose.
#
#   ./deploy.sh                          # local trial on http://localhost
#   ./deploy.sh https://auction.example.com   # public server, automatic HTTPS
#   ./deploy.sh http://203.0.113.10      # public server by IP, plain HTTP
#   ./deploy.sh --seed                   # also load the demo campaign + users
#
# First run writes ./.env with random secrets and prints the admin password.
# Later runs reuse ./.env and just rebuild + restart the containers.
set -euo pipefail
cd "$(dirname "$0")"

SEED=false; URL=""
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) URL="$arg" ;;
  esac
done

command -v docker >/dev/null || { echo "docker is not installed: https://docs.docker.com/engine/install/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose v2 is required"; exit 1; }

rand() { if command -v openssl >/dev/null; then openssl rand -hex "$1"; else od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'; fi; }

PROJECT="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')"
if [ ! -f .env ]; then
  if docker volume inspect "${PROJECT}_postgres-data" >/dev/null 2>&1; then
    echo "A database volume from a previous deployment exists (${PROJECT}_postgres-data) but ./.env is missing."
    echo "Restore the old .env (its PG_PASSWORD matches that database), or wipe the old data with:  docker compose down -v"
    exit 1
  fi
  URL="${URL:-http://localhost}"; URL="${URL%/}"
  HOST="${URL#*://}"; HOST="${HOST%%/*}"
  case "$URL" in
    https://*) CADDY_SITE="${HOST%%:*}" ;;
    *)         CADDY_SITE=":80" ;;
  esac
  PORT="${HOST##*:}"; [ "$PORT" = "$HOST" ] && PORT=""
  HTTP_PORT="${PORT:-80}"
  ADMIN_PASSWORD="$(rand 8)"
  cat > .env <<ENV
PUBLIC_URL=$URL
CADDY_SITE=$CADDY_SITE
HTTP_PORT=$HTTP_PORT
HTTPS_PORT=443
PG_PASSWORD=$(rand 16)
JWT_SECRET=$(rand 32)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
AUTH_MODE=password
SEED_DEMO=$SEED
AUTO_BID_DELAY_MS=1000
ENV
  echo "==> wrote .env (keep it: it holds the database password and JWT secret)"
  NEW_ENV=true
else
  [ -n "$URL" ] && echo "note: .env already exists, ignoring URL argument. Edit PUBLIC_URL/CADDY_SITE in .env to change it."
  if $SEED; then sed -i.bak 's/^SEED_DEMO=.*/SEED_DEMO=true/' .env && rm -f .env.bak; fi
  NEW_ENV=false
fi

set -a; . ./.env; set +a

echo "==> building images and starting containers"
docker compose up -d --build --remove-orphans

echo "==> waiting for the API"
for i in $(seq 1 60); do
  if docker compose ps --format '{{.Service}} {{.Health}}' | grep -q '^api healthy'; then break; fi
  sleep 2
  [ "$i" = 60 ] && { echo "API did not become healthy. Logs:"; docker compose logs --tail=50 api; exit 1; }
done

echo
echo "==> auction is running at $PUBLIC_URL"
if $NEW_ENV; then
  echo "    admin login:  $ADMIN_USERNAME / $ADMIN_PASSWORD   (also in .env)"
fi
$SEED && echo "    demo users: nguyenan, tranbinh, lechi, hoangdung, phamhuy (no password needed only if AUTH_MODE=username_only)"
echo "    logs:   docker compose logs -f"
echo "    stop:   docker compose down        (data is kept in volumes; add -v to wipe it)"

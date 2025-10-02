#!/bin/sh
set -e

APP_DIR="/app/server"

cd "$APP_DIR"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
fi

exec "$@"

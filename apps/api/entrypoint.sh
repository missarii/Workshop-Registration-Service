#!/bin/sh
# API container entrypoint: apply schema, seed (idempotent), then start.
set -e

cd /app/apps/api

echo "🗄  Applying database schema (prisma db push)..."
pnpm --filter api exec prisma db push --schema ../../prisma/schema.prisma --skip-generate

echo "🌱 Seeding database (skips automatically if already seeded)..."
pnpm --filter api exec prisma db seed

echo "🚀 Starting API..."
exec node dist/main

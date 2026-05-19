#!/usr/bin/env bash
# Hook: before-prisma-migrate
# Pede confirmação antes de aplicar migration. Evita rodar accidental
# em ambiente errado (especialmente staging/prod).

set -e

CURRENT_ENV="${NODE_ENV:-development}"
DATABASE_URL_REDACTED=$(echo "${DATABASE_URL:-?}" | sed 's/:[^:@]*@/:***@/')

echo ""
echo "⚠  About to run Prisma migrate."
echo "   Environment: $CURRENT_ENV"
echo "   Target DB:   $DATABASE_URL_REDACTED"
echo ""

if [ "$CURRENT_ENV" = "production" ] || [ "$CURRENT_ENV" = "staging" ]; then
  echo "   ⚠  This is $CURRENT_ENV. Confirm by typing the env name:"
  read -r CONFIRM
  if [ "$CONFIRM" != "$CURRENT_ENV" ]; then
    echo "✗ Confirmation failed. Aborting."
    exit 1
  fi
else
  read -p "   Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✗ Aborted."
    exit 1
  fi
fi

echo "✓ Confirmed. Proceeding with migration."

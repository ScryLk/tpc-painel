#!/usr/bin/env bash
# Hook: before-push
# Roda antes de git push pra evitar quebrar main com type errors ou testes vermelhos.
# Configurado em .claude/hooks/config.json (ou via git pre-push se preferir).

set -e

echo "→ Running typecheck..."
pnpm typecheck

echo "→ Running tests..."
pnpm test

echo "✓ All checks passed. Pushing."

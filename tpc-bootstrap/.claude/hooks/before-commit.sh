#!/usr/bin/env bash
# Hook: before-commit
# Autofix lint issues. Não bloqueia commit se autofix resolveu tudo.

set -e

echo "→ Running lint autofix on staged files..."
pnpm lint --fix

# Re-stage anything lint may have changed
git update-index --again || true

echo "✓ Lint clean."

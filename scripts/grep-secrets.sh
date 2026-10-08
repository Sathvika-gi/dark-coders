#!/usr/bin/env bash
# scripts/grep-secrets.sh
# Scans .next/static for secret patterns after a production build.
# Fails (exit 1) if any match is found — CI gate.
#
# Usage: bash scripts/grep-secrets.sh
set -euo pipefail

STATIC_DIR=".next/static"
FAILED=0

echo "🔍 Scanning ${STATIC_DIR} for secret patterns..."

# Patterns that should NEVER appear in client-side bundles
PATTERNS=(
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_SERVICE_ROLE"
  "sk-ant-"
  "SESSION_SECRET"
  "service_role"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*role.*service"
)

if [ ! -d "$STATIC_DIR" ]; then
  echo "⚠️  ${STATIC_DIR} does not exist. Run 'npm run build' first."
  exit 1
fi

for pattern in "${PATTERNS[@]}"; do
  matches=$(grep -r --include="*.js" -l "$pattern" "$STATIC_DIR" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "❌ SECRET LEAK DETECTED: pattern '$pattern' found in:"
    echo "$matches"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "💥 Secret scan FAILED. Review the files above and ensure secrets are server-only."
  exit 1
else
  echo "✅ No secrets found in client bundles. Safe to deploy."
fi

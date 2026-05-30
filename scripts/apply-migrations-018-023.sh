#!/usr/bin/env bash
# Apply Kynda migrations 018-023 to production Supabase via the transaction pooler
# (db host :6543). ON_ERROR_STOP halts a file on the first error. Migrations are
# idempotent (IF NOT EXISTS / DROP POLICY ... CREATE), so re-running is safe.
#
# Password is supplied via PGPASSFILE (set by caller) to avoid shell-escaping the
# special chars in the password. Never hard-code the secret here.
#
# Usage:
#   PF=$(mktemp); chmod 600 "$PF"
#   printf 'db.<ref>.supabase.co:6543:postgres:postgres:<PASSWORD>\n' > "$PF"
#   PGPASSFILE="$PF" bash scripts/apply-migrations-018-023.sh
#   rm -f "$PF"
#
# NOTE: direct 5432 on the db host was unreachable (IPv6/blocked) during the
# initial run; the :6543 transaction pooler worked. DDL applies fine over it.
set -uo pipefail

HOST="db.svfuuvaaynmcofyrkwus.supabase.co"
PORT="6543"
CONN="host=${HOST} port=${PORT} dbname=postgres user=postgres sslmode=require connect_timeout=20"
DIR="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"

FILES=(
  "018_catalog_channel_visibility.sql"
  "019_onboarding_hub.sql"
  "020_monthly_specials.sql"
  "021_marketing_approval_gate.sql"
  "022_b2b_pipeline.sql"
  "023_menumetrics_inventory.sql"
)

FAIL=0
for f in "${FILES[@]}"; do
  echo "============================================================"
  echo "=== Applying ${f}"
  echo "============================================================"
  if psql "${CONN}" -v ON_ERROR_STOP=1 -f "${DIR}/${f}"; then
    echo "=== OK ${f}"
  else
    echo "=== FAILED ${f} (stopping)"
    FAIL=1
    break
  fi
  sleep 1
done

if [[ $FAIL -eq 0 ]]; then
  echo "ALL MIGRATIONS APPLIED OK"
else
  echo "MIGRATION RUN ABORTED"
  exit 1
fi

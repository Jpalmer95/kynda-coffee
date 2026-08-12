#!/usr/bin/env bash
# ============================================================
# Kynda Coffee — Apply generated content load files to production
# ============================================================
# Reads the Supabase DB connection string from the droplet's
# /root/kynda-supabase-db.env, uploads the generated load files, and applies
# them to the production DB via psql on the droplet (regional pooler).
#
# Usage:
#   bash scripts/platform_content_apply.sh          # apply all load files
#   bash scripts/platform_content_apply.sh --recipes  # recipes only
#
# Requires: ssh access to root@167.99.125.127, psql on the droplet.
# ============================================================
set -uo pipefail

DROPLET="root@167.99.125.127"
DB_ENV="/root/kynda-supabase-db.env"
ONLY="${1:-all}"

echo "→ Fetching DB connection from droplet..."
DBURL=$(timeout 20 ssh -o ConnectTimeout=10 "$DROPLET" "grep SUPABASE_DB_URL $DB_ENV | cut -d= -f2-")
if [[ -z "$DBURL" ]]; then echo "ERROR: could not read DB URL from droplet"; exit 1; fi
DBHOST=$(echo "$DBURL" | sed -E 's#.*@([^:/]+):[0-9]+/.*#\1#')
DBPORT=$(echo "$DBURL" | sed -E 's#.*@[^:/]+:([0-9]+)/.*#\1#')
DBUSER=$(echo "$DBURL" | sed -E 's#postgresql://([^:]+):.*#\1#')
DBPASS=$(echo "$DBURL" | sed -E 's#.*:([^@]+)@.*#\1#')

# Upload the needed load files
FILES=()
[[ "$ONLY" == "all" || "$ONLY" == "recipes" ]]   && FILES+=(/tmp/load_recipes.sql)
[[ "$ONLY" == "all" || "$ONLY" == "handbook" ]]   && FILES+=(/tmp/load_handbook.sql)
[[ "$ONLY" == "all" || "$ONLY" == "checklists" ]] && FILES+=(/tmp/load_checklists.sql)
[[ "$ONLY" == "all" || "$ONLY" == "training" ]]   && FILES+=(/tmp/load_training.sql)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || { echo "  (skip, not generated: $f)"; continue; }
  echo "→ Uploading $(basename "$f") ..."
  scp -o ConnectTimeout=10 "$f" "$DROPLET:/tmp/$(basename "$f")"
done

# Build a PGPASSFILE on the droplet and apply each file
REMOTE=$(mktemp)
cat > "$REMOTE" <<EOF
set -uo pipefail
PF=\$(mktemp); chmod 600 "\$PF"
printf '%s:%s:*:%s:%s\n' "$DBHOST" "$DBPORT" "$DBUSER" "$DBPASS" > "\$PF"
export PGPASSFILE="\$PF"
CONN="host=$DBHOST port=$DBPORT dbname=postgres user=$DBUSER sslmode=require connect_timeout=12"
for f in ${FILES[@]}; do
  b=\$(basename "\$f")
  [[ -f "/tmp/\$b" ]] || continue
  echo "→ Applying \$b ..."
  psql "\$CONN" -v ON_ERROR_STOP=1 -f "/tmp/\$b" 2>&1 | grep -viE "NOTICE|already exists" | head -6
done
rm -f "\$PF"
echo "APPLY COMPLETE"
EOF
scp -o ConnectTimeout=10 "$REMOTE" "$DROPLET:/tmp/apply_pipeline.sh" >/dev/null
timeout 90 ssh -o ConnectTimeout=10 "$DROPLET" 'bash /tmp/apply_pipeline.sh'
rm -f "$REMOTE"
echo ""
echo "Verify counts in the admin/staff UI."

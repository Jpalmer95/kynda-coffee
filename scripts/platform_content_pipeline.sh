#!/usr/bin/env bash
# ============================================================
# Kynda Coffee — _PLATFORM → Production Content Pipeline
# ============================================================
# One command to seed the staff/admin private DB from the curated
# _PLATFORM/ folder of the Drive export. Idempotent where possible
# (recipes/handbook/training upsert by natural key; checklists update).
#
# This is the "make the site the source of truth" bridge:
#   /mnt/flex/.../KYNDA COFFEE 2026/_PLATFORM/  ->  Supabase staff/admin tables
#
# Usage:
#   cd /home/jonathan/dev/kynda-coffee
#   bash scripts/platform_content_pipeline.sh [--dry-run]
# ============================================================
set -uo pipefail

DRY=""
if [[ "${1:-}" == "--dry-run" ]]; then DRY="--dry-run"; echo "DRY-RUN MODE (no DB writes)"; fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=========================================="
echo "  KYNDA CONTENT PIPELINE  ($(date +%F\ %T))"
echo "=========================================="

# ---- 1. Recipes (91) ----
echo ""
echo "[1/4] Recipes → recipes table"
python3 scripts/seed_recipes_from_platform.py $DRY 2>&1 | tail -4

# ---- 2. Employee Handbook (8 sections) ----
echo ""
echo "[2/4] Employee Handbook → handbook_sections"
python3 scripts/seed_handbook_from_platform.py 2>&1 | tail -3
echo "  (load /tmp/kynda_handbook.json via psql per README — see seed script)"

# ---- 3. Shift Duties (checklists) ----
echo ""
echo "[3/4] Shift Duties 2025 → checklists"
python3 scripts/seed_checklists_from_platform.py 2>&1 | tail -4

# ---- 4. Training Checklist (13 modules) ----
echo ""
echo "[4/4] Training Checklist 2026 → training_modules"
python3 scripts/seed_training_from_platform.py 2>&1 | tail -4

echo ""
echo "=========================================="
echo "  PIPELINE COMPLETE"
echo "=========================================="
echo "NOTE: This script generates the SQL/JSON load files."
echo "Apply them to production with the droplet psql recipe in"
echo "supabase-migration-apply.md (PGPASSFILE + pooler), or run the"
echo "load_*.sql via psql against the target DB."

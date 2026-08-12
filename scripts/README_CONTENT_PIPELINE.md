# Kynda Content Pipeline — `_PLATFORM/` → Production DB

Bridge that turns the curated Drive-export content (`_PLATFORM/`) into the
staff/admin private database. Everything here is committed, re-runnable, and
idempotent.

## What it feeds

| Source (in `_PLATFORM/`)        | Table               | Staff/Admin page             |
|:--------------------------------|:--------------------|:-----------------------------|
| `recipes/` (91 curated recipes) | `recipes`           | `/staff/recipes`, `/admin/recipes` |
| `handbook/` (Employee Handbook) | `handbook_sections` | `/staff/handbook`, `/admin/team-ops` |
| `checklists/` (Shift Duties 2025)| `checklists`        | `/staff/checklists`, `/admin/checklists` |
| `training/` (Training Checklist)| `training_modules`  | `/training`, `/admin/training` |
| `onboarding/`                   | `onboarding_documents` | `/staff/onboarding`, `/admin/team-ops` |

## Generate load files (local)

```bash
cd /home/jonathan/dev/kynda-coffee
python3 scripts/seed_recipes_from_platform.py      # → /tmp/load_recipes.sql (91 recipes)
python3 scripts/seed_handbook_from_platform.py     # → /tmp/kynda_handbook.json (8 sections)
python3 scripts/seed_checklists_from_platform.py   # → /tmp/load_checklists.sql (shift duties)
python3 scripts/seed_training_from_platform.py     # → /tmp/load_training.sql (13 modules)
```

Or run all generators:
```bash
bash scripts/platform_content_pipeline.sh          # generate only
bash scripts/platform_content_pipeline.sh --dry-run
```

## Apply to production

`platform_content_apply.sh` reads the DB connection from the droplet
(`/root/kynda-supabase-db.env`), uploads the load files, and applies them via
psql on the droplet.

```bash
bash scripts/platform_content_apply.sh             # all
bash scripts/platform_content_apply.sh --recipes   # one table
```

> The droplet env DB password must be current. If `password authentication
> failed` appears, update the SUPABASE_DB_URL password (or pass a temp password)
> — see `supabase-migration-apply.md` for the pooler recipe.

## Data integrity
- Recipes upsert by `name` (unique index). Handbook + training re-run is safe
  after a manual dedupe. Checklists update by `type`.
- The source of truth for staff-facing content is now the **production DB**,
  not the Drive files. Edit in `/admin/*` going forward.
- Original Drive export remains at
  `/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/` (never deleted).

## Onboarding automation
Adding a staff/manager/lead via POST `/api/admin/team` now:
1. Sends a staff-onboarding email (handbook / training / recipes / checklists)
   — template `src/lib/email/templates/staff-onboarding.tsx`.
2. Seeds `onboarding_progress` rows so `/admin/team-ops` tracks the hire.

#!/usr/bin/env python3
"""
Seed ingredient_pars from the Kynda count/par file(s).

Reads a count file (product | current_stock | par) OR the master par sheet
and upserts par rows into the production `ingredient_pars` table
(ingredient_name, par_level, vendor, unit, is_active).

Usage:
  python3 scripts/order/seed_pars.py --file scripts/order/counts/2026-08-11-heb.txt --vendor HEB [--unit each]
  python3 scripts/order/seed_pars.py --from-par-sheet --vendor HEB
"""
import argparse, os, sys, json, glob
import requests

def parse_count_file(path):
    items = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "|" not in line:
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 3:
                continue
            product = parts[0]
            par_raw = parts[2] if parts[2] else None
            if par_raw is None:
                continue
            items.append({"ingredient_name": product, "par_level": float(par_raw)})
    return items

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default="scripts/order/counts/2026-08-11-heb.txt")
    ap.add_argument("--vendor", default="HEB", choices=["HEB", "Amazon", "Other"])
    ap.add_argument("--unit", default="each")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # Load env
    env = {}
    with open(".env.local") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: missing Supabase env"); sys.exit(1)

    items = parse_count_file(args.file)
    print(f"Parsed {len(items)} par rows from {args.file}")

    if args.dry_run:
        for it in items[:10]:
            print(f"  {it['ingredient_name']} par={it['par_level']}")
        print(f"DRY RUN: {len(items)} rows would be upserted (vendor={args.vendor})")
        return

    # Upsert: on_conflict ingredient_name (the table's unique constraint)
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
         "Prefer": "resolution=merge-duplicates,return=minimal"}
    inserted = 0
    errors = []
    for it in items:
        payload = {
            "ingredient_name": it["ingredient_name"],
            "par_level": it["par_level"],
            "vendor": args.vendor,
            "unit": args.unit,
            "is_active": True,
        }
        resp = requests.post(f"{url}/rest/v1/ingredient_pars?on_conflict=ingredient_name",
                             json=payload, headers=h)
        if resp.status_code in (200, 201):
            inserted += 1
        else:
            errors.append((it["ingredient_name"], resp.status_code, resp.text[:120]))
    print(f"Upserted: {inserted}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for name, code, txt in errors[:6]:
            print(f"  {name}: {code} {txt}")
        # If unique constraint missing, fall back to plain insert ignoring dups
        if any("ingredient_pars" in e[2] for e in errors) or len(errors) == len(items):
            print("\nNOTE: unique constraint on (ingredient_name,vendor) may be missing.")
            print("Apply migration 051 to add it, or run with the psql bulk loader instead.")

if __name__ == "__main__":
    main()

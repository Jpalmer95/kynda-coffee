#!/usr/bin/env python3
"""
Seed ingredient_pars from the canonical HEB/Amazon ordering list.

Reads scripts/order/heb_canonical_list.tsv (HEB exact name | par | vendor | cat)
and upserts rows into `ingredient_pars` with EXACT HEB names + par + vendor.
This is the source of truth for the admin Master Par List.

Usage:
  python3 scripts/order/seed_pars.py                # seed from canonical list
  python3 scripts/order/seed_pars.py --dry-run
"""
import argparse, os, sys, requests

def parse_canonical(path):
    items = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 2 or not parts[0]:
                continue
            items.append({
                "ingredient_name": parts[0],
                "par_level": float(parts[1]) if parts[1] else 0,
                "vendor": parts[2] if len(parts) > 2 and parts[2] else "HEB",
                "category": parts[3] if len(parts) > 3 else "",
                "asin": parts[4] if len(parts) > 4 else None,
            })
    return items

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--canonical", default="scripts/order/heb_canonical_list.tsv")
    ap.add_argument("--vendor", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

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

    items = parse_canonical(args.canonical)
    if args.vendor:
        items = [i for i in items if i["vendor"] == args.vendor]
    print(f"Parsed {len(items)} par rows from {args.canonical}")

    if args.dry_run:
        for it in items[:8]:
            print(f"  {it['ingredient_name']} par={it['par_level']} vendor={it['vendor']}")
        print(f"DRY RUN: {len(items)} rows would be upserted")
        return

    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
         "Prefer": "resolution=merge-duplicates,return=minimal"}
    inserted = 0
    errors = []
    for it in items:
        payload = {
            "ingredient_name": it["ingredient_name"],
            "par_level": it["par_level"],
            "vendor": it["vendor"],
            "unit": "each",
            "cadence": "biweekly",
            "area": it["category"],
            "is_active": True,
        }
        if it["asin"]:
            payload["asin"] = it["asin"]
            payload["source"] = "amazon-live" if it["vendor"] == "Amazon" else "heb-live"
        resp = requests.post(f"{url}/rest/v1/ingredient_pars?on_conflict=ingredient_name",
                             json=payload, headers=h)
        if resp.status_code in (200, 201):
            inserted += 1
        else:
            errors.append((it["ingredient_name"], resp.status_code, resp.text[:100]))
    print(f"Upserted: {inserted}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for name, code, txt in errors[:6]:
            print(f"  {name}: {code} {txt}")

if __name__ == "__main__":
    main()

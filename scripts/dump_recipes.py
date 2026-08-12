#!/usr/bin/env python3
"""Dump parsed recipes to a JSON file for bulk loading via psql."""
import sys, json, glob, os
sys.path.insert(0, "scripts")
import importlib.util
spec = importlib.util.spec_from_file_location("s", "scripts/seed_recipes_from_platform.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

BASE = "/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/_PLATFORM/recipes"
files = sorted(glob.glob(os.path.join(BASE, "**", "*.docx"), recursive=True))
parsed = {}
for fp in files:
    rel = os.path.relpath(fp, BASE)
    folder = rel.split(os.sep)[0]
    b = os.path.basename(fp).lower()
    if "template" in b:
        continue
    r = m.parse_recipe(fp, folder)
    if r and r["name"] not in parsed:
        parsed[r["name"]] = r
out = list(parsed.values())
with open("/tmp/kynda_recipes.json", "w") as f:
    json.dump(out, f)
print(f"Dumped {len(out)} recipes to /tmp/kynda_recipes.json")

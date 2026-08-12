#!/usr/bin/env python3
"""
Seed the Kynda `recipes` table from the curated _PLATFORM/recipes docx files.
Converts each .docx into {name, category, ingredients[], steps[], prep_time, servings, notes}
and upserts via Supabase service-role REST API.

Usage:
  cd /home/jonathan/dev/kynda-coffee
  python3 scripts/seed_recipes_from_platform.py  [--dry-run]
"""
import os, re, sys, glob, json, argparse, zipfile
import requests
from collections import OrderedDict

BASE = "/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/_PLATFORM/recipes"
ALLOWED = {"espresso", "cold-brew", "tea", "smoothie", "food", "pastry", "seasonal"}

# Folder -> likely category (heuristic, refined by content)
DRINK_CORE_KEYWORDS = {
    "smoothie": ("smoothie",), "lemonade": ("lemonade",), "frappe": ("espresso",),
    "milkshake": ("smoothie",), "cold brew": ("cold-brew",), "cold foam": ("espresso",),
    "affogato": ("espresso",), "mocha": ("espresso",), "sundae": ("food",),
}
FOOD_KEYWORDS = ("waffle", "muffin", "bread", "cookie", "panini", "salad", "soup",
                 "crouton", "aioli", "focaccia", "kolache", "scone", "brownie", "cake",
                 "biscuit", "crispy", "bar", "sugar", "pizza", "sandwich", "frosting",
                 "buttercream", "toast", "pesto")

def extract_paras(docx_path):
    """Return list of (text) paragraphs, preserving structure."""
    try:
        z = zipfile.ZipFile(docx_path)
        xml = z.read("word/document.xml").decode("utf-8", "ignore")
    except Exception as e:
        return []
    paras = []
    for para in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", para))
        t = t.strip()
        if t:
            paras.append(t)
    return paras

def parse_recipe(docx_path, folder):
    paras = extract_paras(docx_path)
    if not paras:
        return None
    name = paras[0].strip().strip("_").strip()
    # heading = paragraph with 'ingredients' (case-insens), then 'instructions', then 'notes'
    text = paras
    title = name
    # Find section boundaries
    ing_idx = next((i for i, p in enumerate(text) if p.strip().lower() == "ingredients"), None)
    ins_idx = next((i for i, p in enumerate(text) if p.strip().lower() == "instructions"), None)
    note_idx = next((i for i, p in enumerate(text) if p.strip().lower() == "notes"), None)

    def section(start, end):
        if start is None: return []
        end = len(text) if end is None else end
        return text[start+1:end]

    ing_raw = section(ing_idx, min(i for i in [ins_idx, note_idx, len(text)] if i is not None and (i is None or i > (ing_idx or -1))))
    # safer: ingredients are between ing_idx and the next section header
    ingredients = []
    servings = 1
    # parse servings from a line like "Servings: 2"
    for p in text[:5]:
        m = re.match(r"servings?\s*[:]?\s*(\d+)", p, re.I)
        if m:
            servings = int(m.group(1))
            break

    if ing_idx is not None:
        end = ins_idx if ins_idx is not None else (note_idx if note_idx is not None else len(text))
        for p in text[ing_idx+1:end]:
            p2 = p.strip()
            if not p2: continue
            if re.match(r"^(step|optional|flavor|topping|small|medium|large|instructions|notes)", p2, re.I):
                continue
            # Parse "2 oz Steamed milk" / "½ Cup Waffle Mix" into {name, amount, unit}
            # unit must be a known measurement unit; otherwise it's part of the name
            KNOWN_UNITS = r"(oz|cup|cups|tbsp|tsp|lb|lbs|g|kg|ml|gal|pkg|pckg|each|shot|shots|patty|dollop|sprinkle|slice|slices|inch|pinch|whole|half|scoop|bag|bottle|can|jar|liter|pint|quart)"
            m = re.match(r"^([\d¼½¾⅓⅔⅛\-–]+(?:\.\d+)?)\s*(" + KNOWN_UNITS + r")?\s*(.*)$", p2, re.I)
            if m and m.group(3):
                amount = m.group(1)
                unit = m.group(2) or ""
                name = m.group(3).strip()
                ingredients.append({"name": name, "amount": amount, "unit": unit})
            else:
                ingredients.append({"name": p2, "amount": "", "unit": ""})

    steps = []
    if ins_idx is not None:
        end = note_idx if note_idx is not None else len(text)
        for i, p in enumerate(text[ins_idx+1:end], start=1):
            p2 = p.strip()
            if not p2 or p2.lower() == "notes": continue
            # strip leading "Step N - "
            p2 = re.sub(r"^step\s*\d+\s*[-:]\s*", "", p2, flags=re.I)
            steps.append({"order": i, "instruction": p2})

    notes = None
    if note_idx is not None and note_idx+1 < len(text):
        notes = " ".join(text[note_idx+1:]).strip() or None

    prep_time = 5
    # category heuristic
    cat = infer_category(title, folder, ingredients, steps)
    return {
        "name": title,
        "category": cat,
        "ingredients": ingredients,
        "steps": steps,
        "prep_time_minutes": prep_time,
        "servings": servings,
        "notes": notes,
    }

def infer_category(title, folder, ingredients, steps):
    ing_text = " ".join(i.get("name", "") for i in ingredients if isinstance(i, dict))
    low = title.lower() + " " + ing_text.lower()
    if "seasonal" in folder or "seasonal" in low:
        # seasonal could be food or drink — detect food
        if any(k in low for k in FOOD_KEYWORDS) and not any(k in low for k in ("latte", "cold brew", "smoothie", "lemonade", "frappe", "tea", "mocha", "brew")):
            return "pastry"
        return "seasonal"
    if "food" in folder or "baked" in folder or "pastry" in folder:
        if any(k in low for k in ("muffin", "cookie", "scone", "bread", "brownie", "cake", "bar", "biscuit", "frosting", "crispy", "cake pop")):
            return "pastry"
        return "food"
    if "drinks" in folder or "drink" in folder:
        # Map to ALLOWED categories only (espresso, cold-brew, tea, smoothie, food, pastry, seasonal)
        if any(k in low for k in ("matcha", "chai", "tea", "arnold palmer", "green harmony", "solar eclipse", "pitcher")):
            return "tea"
        if any(k in low for k in ("cold brew", "nitro", "cold foam", "cold brew float", "coconut island")):
            return "cold-brew"
        if any(k in low for k in ("smoothie", "milkshake", "mangonada", "strawberry banana")):
            return "smoothie"
        if any(k in low for k in ("frappe", "affogato")):
            return "espresso"
        if any(k in low for k in ("latte", "cortado", "americano", "cappuccino", "macchiato",
                                  "flat white", "espresso", "mocha", "caramel", "peppermint mocha",
                                  "queen bee", "biscoff", "lavender", "horchata", "pumpkin spice",
                                  "harvest", "golden spice", "cinnamon", "ocean water", "shaken honey",
                                  "cupid", "chocolate covered", "twilight", "iced green", "lemonade")):
            return "espresso"
        # lemonade / juice / non-espresso drinks -> seasonal (closest allowed for house specials)
        return "seasonal"
    return "food"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default=None, help="substring filter on filename")
    args = ap.parse_args()

    # Load env
    env = {}
    try:
        with open(".env.local") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        print("ERROR: .env.local not found. Run from repo root.")
        sys.exit(1)

    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: missing Supabase URL or service role key in .env.local")
        sys.exit(1)

    # Gather recipes
    files = sorted(glob.glob(os.path.join(BASE, "**", "*.docx"), recursive=True))
    parsed = []
    for fp in files:
        rel = os.path.relpath(fp, BASE)
        folder = rel.split(os.sep)[0]
        if args.only and args.only.lower() not in os.path.basename(fp).lower():
            continue
        # skip template + pending review unless asked
        b = os.path.basename(fp).lower()
        if "template" in b and args.only is None:
            continue
        r = parse_recipe(fp, folder)
        if r:
            parsed.append((rel, r))

    print(f"Parsed {len(parsed)} recipes from {len(files)} docx files\n")
    # Dedupe by name
    seen = OrderedDict()
    for rel, r in parsed:
        if r["name"] not in seen:
            seen[r["name"]] = (rel, r)
    deduped = list(seen.values())
    print(f"Unique recipes after dedupe: {len(deduped)}\n")

    from collections import Counter
    print("Category breakdown:")
    for cat, n in Counter(r["category"] for _, r in deduped).items():
        print(f"  {cat}: {n}")

    if args.dry_run:
        print("\n--- DRY RUN (first 8) ---")
        for rel, r in deduped[:8]:
            print(f"  {r['name']} [{r['category']}] servings={r['servings']} ing={len(r['ingredients'])} steps={len(r['steps'])}")
        print("\nDry run complete. No writes.")
        return

    # Upsert via REST (service role bypasses RLS)
    hdr = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"}
    inserted = 0
    errors = []
    for rel, r in deduped:
        payload = {
            "name": r["name"],
            "category": r["category"],
            "ingredients": r["ingredients"],
            "steps": r["steps"],
            "prep_time_minutes": r["prep_time_minutes"],
            "servings": r["servings"],
            "notes": r["notes"],
        }
        # upsert by name (avoid duplicates)
        resp = requests.post(f"{url}/rest/v1/recipes", json=payload, headers=hdr, params={"on_conflict": "name"})
        if resp.status_code in (200, 201):
            inserted += 1
        else:
            errors.append((r["name"], resp.status_code, resp.text[:200]))
    print(f"\nInserted/updated: {inserted}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for name, code, txt in errors[:10]:
            print(f"  {name}: {code} {txt}")

if __name__ == "__main__":
    main()

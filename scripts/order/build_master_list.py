#!/usr/bin/env python3
"""
Build the single Kynda master ordering list from the HEB + Amazon canonical
lists. Output: scripts/order/kynda_canonical_list.tsv

Unified format (one file, all vendors):
  name | par | vendor | category | cadence | asin

- HEB items: cadence=weekly (HEB ordered Mon+Thu / weekly), no ASIN.
- Amazon items: cadence=monthly (Amazon ordered last Tuesday), ASIN present.
- Rows are sorted by vendor then category then name.
"""
import re, unicodedata

# Items that are NOT Kynda inventory to order (electronics, one-off appliances).
# Kept out of the ordering list but preserved in a review file.
NON_INVENTORY_PATTERNS = [
    "humidifier", "printer", "fire tv", "streaming device", "wifi", "router",
    "mesh system", "levoit", "govee", "dreo", "tplink", "decob", "tv stick",
    "monitor", "keyboard", "laptop", "tablet", "phone", "camera",
]

def norm(s):
    s = unicodedata.normalize("NFKD", s).lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\b(oz|lb|lbs|ct|pk|pack|packs?|case|count|fl|with|for|of|the|and|by|amp)\b", " ", s)
    s = re.sub(r"\d+(?:\.\d+)?", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def read_tsv(path):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 3 or not parts[0]:
                continue
            rows.append(parts)
    return rows

def main():
    heb = read_tsv("heb_canonical_list.tsv")      # name|par|HEB|category
    amazon = read_tsv("amazon_canonical_list.tsv") # name|par|Amazon|category|asin

    out = []
    # HEB: name|par|vendor|category|cadence|asin
    for r in heb:
        name, par, vendor, category = r[0], r[1], r[2], r[3] if len(r) > 3 else ""
        out.append([name, par, "HEB", category, "weekly", ""])
    # Amazon
    for r in amazon:
        name, par, vendor, category = r[0], r[1], r[2], r[3] if len(r) > 3 else ""
        asin = r[4] if len(r) > 4 else ""
        out.append([name, par, "Amazon", category, "monthly", asin])

    # Dedup by normalized name (in case an item appears in both lists)
    seen = {}
    for row in out:
        key = norm(row[0])
        if key not in seen:
            seen[key] = row
        # if duplicate, keep the one with an ASIN (more specific)

    rows = sorted(seen.values(), key=lambda r: (r[2], r[3], r[0].lower()))

    # Separate non-inventory items into a review file
    inventory, review = [], []
    for r in rows:
        low = r[0].lower()
        if any(p in low for p in NON_INVENTORY_PATTERNS):
            review.append(r)
        else:
            inventory.append(r)

    with open("kynda_canonical_list.tsv", "w") as f:
        f.write("# Kynda — SINGLE MASTER ORDERING LIST (all vendors)\n")
        f.write("# One file drives HEB orders, Amazon orders, and the staff count sheet.\n")
        f.write("# Format: name | par | vendor | category | cadence | asin\n")
        for r in inventory:
            f.write("|".join(r) + "\n")

    # Review file: items excluded from ordering (non-inventory) + missing pars
    missing_par = [r for r in inventory if not r[1]]
    with open("amazon_order_review.txt", "w") as f:
        f.write("KYNDA ORDER REVIEW — items needing attention\n")
        f.write("=" * 70 + "\n\n")
        f.write("A) NON-INVENTORY (removed from ordering list, likely electronics/one-offs):\n")
        for r in review:
            f.write(f"   - {r[0][:90]} ({r[2]})\n")
        f.write(f"\n   ({len(review)} total)\n\n")
        f.write("B) MISSING PAR (on the order list but no par value — owner must set):\n")
        for r in missing_par:
            f.write(f"   - {r[0][:90]} | {r[2]} | {r[3]}\n")
        f.write(f"\n   ({len(missing_par)} total)\n")

    print(f"Master list: {len(inventory)} items "
          f"(HEB={sum(1 for r in inventory if r[2]=='HEB')}, "
          f"Amazon={sum(1 for r in inventory if r[2]=='Amazon')})")
    print(f"Excluded as non-inventory: {len(review)}")
    print(f"Amazon items missing par: {len(missing_par)}")
    print("Wrote scripts/order/kynda_canonical_list.tsv + amazon_order_review.txt")

if __name__ == "__main__":
    main()

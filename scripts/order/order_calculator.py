#!/usr/bin/env python3
"""
Kynda HEB/Amazon Order Calculator (the "Brain")

Reads a fresh inventory count file (product | current_stock | par) and computes
need_to_order = max(0, par - current_stock), rounded up to whole units for
countable items. Handles decimals (e.g. milk gallons) and empty stock.

Outputs:
  - a clean order list (need_to_order > 0) as JSON / TSV
  - an updated count file with a computed "buy" column
  - optionally writes the order list to a file the browser agent consumes

Usage:
  python3 scripts/order/order_calculator.py scripts/order/counts/2026-08-11-heb.txt
  python3 scripts/order/order_calculator.py --file counts/2026-08-11-heb.txt --vendor HEB --json
"""
import argparse, os, json, re, math
from datetime import date

ROUND_CATEGORIES = {"milk", "gal", "pack", "case", "loaf", "bag", "jar", "can", "ct", "box", "oz"}

def parse_canonical_list(path):
    """Parse the canonical HEB/Amazon list: 'HEB exact name | par | vendor | category'."""
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
                "product": parts[0],
                "par": float(parts[1]) if parts[1] else None,
                "vendor": parts[2] if len(parts) > 2 and parts[2] else "HEB",
                "category": parts[3] if len(parts) > 3 else "",
            })
    return items

def parse_count_file(path):
    """Parse 'product | current_stock | par' lines. Skips comments/blank."""
    items = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" in line and not "|" in line:
                continue
            if "|" not in line:
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 2:
                continue
            product = parts[0]
            stock_raw = parts[1] if len(parts) > 1 and parts[1] != "" else None
            par_raw = parts[2] if len(parts) > 2 and parts[2] != "" else None
            items.append({
                "product": product,
                "current_stock": float(stock_raw) if stock_raw else None,
                "par": float(par_raw) if par_raw else None,
            })
    return items

def compute(items, vendor="HEB"):
    """need_to_order = max(0, par - stock), rounded sensibly."""
    out = []
    for it in items:
        par = it["par"]
        stock = it["current_stock"]
        if par is None:
            it["need"] = 0
            it["status"] = "no-par"
            out.append(it); continue
        if stock is None:
            # unknown stock -> assume at par (no order) but flag for review
            it["need"] = 0
            it["status"] = "unknown-stock-review"
            out.append(it); continue
        raw = par - stock
        need = max(0, math.ceil(raw))  # round up to whole unit
        it["need"] = need
        it["status"] = "order" if need > 0 else "ok"
        out.append(it)
    return out

def to_order_list(items):
    return [{"product": i["product"], "qty": i["need"]}
            for i in items if i["need"] > 0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?", default="scripts/order/counts/2026-08-11-heb.txt")
    ap.add_argument("--canonical", default="scripts/order/kynda_canonical_list.tsv",
                    help="canonical list (HEB exact names + par). If given, par comes from here.")
    ap.add_argument("--vendor", default="HEB")
    ap.add_argument("--json", action="store_true", help="emit order list as JSON")
    ap.add_argument("--out", help="write order list TSV to this path")
    args = ap.parse_args()

    if args.canonical:
        # Merge: canonical gives exact HEB names + par; count file gives current stock.
        canon = parse_canonical_list(args.canonical)
        counts = {it["product"].lower(): it["current_stock"] for it in parse_count_file(args.file)}
        items = []
        for c in canon:
            items.append({
                "product": c["product"],
                "par": c["par"],
                "current_stock": counts.get(c["product"].lower()),
                "vendor": c["vendor"],
            })
    else:
        items = parse_count_file(args.file)

    computed = compute(items, args.vendor)
    order = to_order_list(computed)

    print(f"=== KYNDA {args.vendor} ORDER — {date.today().isoformat()} ===")
    print(f"Items processed: {len(computed)}  |  Need to order: {len(order)}")
    print(f"{'Product':<62} {'stock':>6} {'par':>6} {'need':>5}")
    print("-" * 86)
    for i in computed:
        mark = "★" if i["need"] > 0 else " "
        print(f"{mark}{i['product']:<61} {str(i['current_stock'] or '-'):>6} {str(i['par'] or '-'):>6} {i['need']:>5}")
    print("-" * 86)
    total = sum(i["need"] for i in computed)
    print(f"TOTAL LINE ITEMS TO ORDER: {len(order)}  (sum qty: {total})")

    if args.json:
        print("\n=== JSON ===")
        print(json.dumps({"vendor": args.vendor, "date": date.today().isoformat(), "items": order}, indent=2))

    if args.out:
        with open(args.out, "w") as f:
            f.write("product\tqty\n")
            for i in order:
                f.write(f"{i['product']}\t{i['qty']}\n")
        print(f"\nWrote order TSV -> {args.out}")

if __name__ == "__main__":
    main()

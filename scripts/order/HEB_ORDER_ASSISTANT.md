# Kynda HEB Order Assistant — Runbook

Automates the weekly HEB order: **count → need-to-order → HEB cart**.

## Architecture

```
Your count (CSV/PDF/paste)                      ──┐
   │                                             │
   ▼                                             │  scripts/order/order_calculator.py
Order Calculator (the Brain)                     │
  need = max(0, par − stock)                     │  → order TSV (product | qty)
   │                                             │
   ▼                                             ▼
HEB Browser Agent (the Hands)                scripts/order/heb_order_agent.py
  login (one-time code) → open "Kynda" saved
  list → set qty per order → Add to Cart
   │                                             │
   ▼                                             ▼
Human reviews cart → checks out
```

## The Brain — compute the order

```bash
cd /home/jonathan/dev/kynda-coffee
# From a count file (product | current_stock | par)
python3 scripts/order/order_calculator.py scripts/order/counts/2026-08-11-heb.txt
# → prints need-to-order, writes TSV with --out
python3 scripts/order/order_calculator.py --out /tmp/heb_order.tsv
```

Seeding par targets (so `/admin/ingredients` has real pars too):
```bash
python3 scripts/order/seed_pars.py --vendor HEB
```

## The Hands — add to HEB cart

HEB requires a **login code** even for the account owner (email OTP), so login is
interactive. Once logged in, the session persists in the Brave CDP profile
(`~/.hermes/chrome-debug`), so you only re-enter a code when HEB expires it.

Login flow:
1. Open `https://www.heb.com/my-account/login`
2. Enter email → Continue → choose "Email OTP" → HEB sends a code
3. **Pause** — enter the code from your inbox
4. Once in, you're set for the session.

Cart-fill flow (runs automatically after login):
1. Open your **"Kynda"** saved list (`/my-account/lists`)
2. For each item in the order TSV, search HEB → open the product → set quantity
3. Click **Add to Cart** (or use the saved-list "Add List to Cart" button)
4. Report which items were found / added / need manual review

## Files

| File | Purpose |
|:-----|:--------|
| `scripts/order/order_calculator.py` | count → need-to-order (the brain) |
| `scripts/order/seed_pars.py` | seed ingredient_pars from count file |
| `scripts/order/heb_order_agent.py` | browser automation to fill HEB cart |
| `scripts/order/counts/*.txt` | saved weekly counts (product\|stock\|par) |

## Human-in-the-loop
- You provide the **login/OTP code** (required by HEB).
- You **review the cart** before checkout.
- Any item the agent can't match (renamed/out-of-stock) is flagged for you.

## Security
- The HEB account credentials are NOT stored in code. Login is done live in the
  browser (or via your saved session), never in a script or config file.

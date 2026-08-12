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

The order is keyed to **HEB's exact product names** (from the canonical list
`heb_canonical_list.tsv`, which mirrors your live "Kynda Master Shopping List 2").
No fuzzy matching needed.

```bash
cd /home/jonathan/dev/kynda-coffee
# 1. (Optional, if the HEB list changed) refresh exact names from the live list
node scripts/order/heb_fetch_list.mjs

# 2. Record your count using EXACT HEB names in counts/<date>-heb.txt
#    Format: <exact HEB name> | <current stock>

# 3. Compute the order (par from canonical, stock from your count)
python3 scripts/order/order_calculator.py scripts/order/counts/2026-08-11-heb-exact.txt \
  --out /tmp/heb_order.tsv
```

The order TSV now contains HEB's exact names, so the browser agent matches them
1:1 (verified: 29/29).

Seeding par targets (so `/admin/ingredients` has real pars too):
```bash
python3 scripts/order/seed_pars.py --vendor HEB
```

## The Hands — add to HEB cart

HEB requires a **login code** even for the account owner (email OTP), so login is
interactive. Two separate steps — log in at your own pace, then fill the cart.

### Step 1 — Log in (you, once, ~1 min)

```bash
cd /home/jonathan/dev/kynda-coffee
node scripts/order/heb_order_agent.mjs --login
```
- Opens HEB login in the automation browser (Brave CDP :9222).
- Enter your email, choose **"Email me a one-time code"**, enter the code.
- The session is then saved in the persistent profile — you won't need the code
  again until HEB expires it.

### Step 2 — Fill the cart (automatic)

```bash
cd /home/jonathan/dev/kynda-coffee
node scripts/order/heb_order_agent.mjs --fill /tmp/heb_order.tsv
```
- Searches each order item, sets the quantity, clicks **Add to Cart**.
- Reports added vs. need-review; browser stays open so you can review/check out.

> One command does both if you're already logged in:
> `node scripts/order/heb_order_agent.mjs /tmp/heb_order.tsv`

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

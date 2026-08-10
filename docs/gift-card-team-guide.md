# Kynda Coffee — Digital Gift Card Guide for Staff

**Last updated:** August 2026

This guide covers how to accept, validate, and redeem Kynda Coffee digital gift cards when customers use them in person at the shop.

---

## What Are Digital Gift Cards?

Customers purchase gift cards on our website (kyndacoffee.com/gift-cards). They pay with a credit card via Stripe, and receive a unique code via email. The code starts with **KYN-** or **KYND-** followed by 12+ characters (e.g., `KYN-ABCD2345EFGH`).

These are **not** Square gift cards. They are managed in our own system (Supabase database) and redeemed through our website's staff portal — not through the Square POS terminal directly.

---

## How to Look Up and Redeem a Gift Card (In-Store)

### Step 1: Get the Code from the Customer

Ask the customer to show you their gift card email or the gift card page on their phone. The code looks like:

```
KYN-ABCD2345EFGH
```

or

```
KYND-2026-X3K9
```

### Step 2: Open the Gift Card Lookup Tool

On the **kitchen tablet** or any staff device:

1. Go to the staff portal: **kyndacoffee.com/staff**
2. Tap **"Gift Cards"** in the navigation menu
3. You'll see the Gift Card Lookup page

> **Quick bookmark:** Save `kyndacoffee.com/staff/gift-cards` on the kitchen iPad for fast access.

### Step 3: Enter the Code

Type or paste the code into the search box. The code is case-insensitive (automatically uppercased). Tap the search button.

- **If the card is found:** You'll see the card's balance, status, and original amount
- **If not found:** Double-check the code with the customer — typos are the most common issue

### Step 4: Check the Status

Before accepting the gift card, verify:

| Status | Meaning | Can Use? |
|--------|---------|----------|
| **active** | Card has funds and is ready to use | ✅ Yes |
| **pending_payment** | Customer purchased but payment hasn't cleared | ❌ No |
| **cancelled** | Card was voided/refunded | ❌ No |
| **redeemed** | Full balance already used up | ❌ No |

Only accept cards with **active** status and a balance greater than $0.00.

### Step 5: Redeem the Card

1. Enter the **order total** in the "Amount to Redeem" field (e.g., `4.75` for a $4.75 latte)
2. Tap **"Redeem"**
3. The system will deduct the amount from the card's balance
4. You'll see a green confirmation with the **remaining balance**
5. Tell the customer their remaining balance

### Step 6: Complete the Sale on Square POS

The gift card redemption is recorded in our system — NOT on the Square POS. To complete the sale:

1. Ring up the order normally on the Square POS
2. For payment, use one of these methods:
   - **"Other" → "Custom Amount"** and enter the redeemed amount as paid by gift card
   - **"Cash"** with the exact gift card amount (if your Square setup doesn't have a "gift card" tender type)
3. If the gift card covers the full amount, the customer pays nothing on Square
4. If the gift card only covers part, the customer pays the remainder on Square (cash/card)

> **Important:** Always ring the order on Square for inventory and sales tax tracking. The gift card redemption is a payment method — not a free order.

---

## Partial Redemption (Customer Has More on Card Than the Order)

If a customer has a $25 gift card but only orders a $5 latte:

1. Enter `5.00` in the "Amount to Redeem" field
2. Tap Redeem
3. The card now has $20 remaining
4. Tell the customer: "You have $20.00 remaining on this gift card."
5. They can use the same code again next time — it stays active until the balance hits $0

---

## Full Redemption (Order Exceeds Card Balance)

If a customer has a $10 gift card but orders $15 worth:

1. The system will NOT let you redeem more than the balance
2. Redeem the full $10 (enter `10.00` or tap "Full Balance")
3. Tell the customer: "Your gift card covers $10.00, the remaining $5.00 will be on Square."
4. Ring up the full $15 on Square, take $5 from the customer (cash/card)
5. The gift card is now at $0.00 balance — it's effectively used up

---

## Common Scenarios

### "I bought a gift card but never got the email"
- Check the admin panel at **/admin/gift-cards** — search by email or code
- Verify the card status is "active" (payment completed)
- The customer can also check their balance at **kyndacoffee.com/gift-cards** (scroll to "Check Balance")

### "My gift card code isn't working"
- Verify the code starts with **KYN-** or **KYND-**
- Check for typos (the system is case-insensitive but every character matters)
- Look up the card on the staff Gift Card Lookup page to see its status
- If status is "pending_payment" — the customer's payment may still be processing or failed

### "Can I reload a gift card?"
- Not currently. Gift cards are single-purchase. Customers can buy a new one anytime on the website.

### "Do gift cards expire?"
- No — Kynda Coffee gift cards do not expire.

---

## Quick Reference Card (Print This for the Register)

```
┌─────────────────────────────────────────────┐
│   KYNDA COFFEE — GIFT CARD QUICK REFERENCE   │
├─────────────────────────────────────────────┤
│                                              │
│  1. Go to: kyndacoffee.com/staff/gift-cards  │
│  2. Enter the customer's gift card code      │
│     (starts with KYN- or KYND-)              │
│  3. Check: Status = ACTIVE, Balance > $0     │
│  4. Enter the order amount                   │
│  5. Tap REDEEM                               │
│  6. Ring up on Square POS (Other/Cash tender)│
│  7. Tell customer their remaining balance    │
│                                              │
│  PARTIAL USE OK: Card stays active with      │
│  remaining balance for next visit.           │
│                                              │
│  ONLY ACCEPT: Status = "active"              │
│  DO NOT ACCEPT: pending_payment, cancelled  │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Admin: Creating Gift Cards Manually

Managers can create gift cards directly (e.g., for promotions or comps):

1. Go to **/admin/gift-cards**
2. Click "New Card"
3. Enter the amount and optional recipient email
4. The card is created as "active" immediately (no payment needed)
5. Share the code with the recipient

Admin can also:
- View all gift cards with search
- Cancel a card (change status to "cancelled")
- Adjust balance (for refunds/corrections)

---

## Technical Notes

- Gift cards are stored in Supabase `gift_cards` table
- Codes use a 32-character alphabet (no ambiguous chars like O/0/I/1)
- Redemption is race-condition-safe (PostgreSQL row lock via `redeem_gift_card` RPC)
- Rate limited: 10 redemption attempts/min/IP, 30 checks/min/IP
- Customer-facing balance check: kyndacoffee.com/gift-cards (bottom of page)
- Staff lookup: kyndacoffee.com/staff/gift-cards (requires staff login)
- Admin management: kyndacoffee.com/admin/gift-cards (manager+ access)

---

## Questions?

Ask Jonathan or the store manager. The gift card system is managed in-house — Square support cannot help with these codes.

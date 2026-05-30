# Kynda Coffee Agent API Bridge

## Purpose

This document explains the secure API bridge between the Kynda Coffee admin platform and the Hermes AI agent. It allows business management from anywhere — store status, marketing, insights, and social scheduling — without exposing sensitive customer data.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────────────┐
│   Hermes Agent      │  HTTPS  │  Kynda Platform (Coolify)   │
│  (any device)       │────────>│  /api/admin/agent           │
│                     │  POST   │  X-Agent-Key auth            │
│  Skill: kynda-      │<────────│                              │
│  coffee-agent       │  JSON   │  Supabase (self-hosted)     │
└─────────────────────┘         └─────────────────────────────┘
```

## Security Model

- **Authentication**: Single API key (`AGENT_API_KEY` env var) via `X-Agent-Key` header
- **No PII exposed**: Customer names, emails, addresses, and payment details are never returned
- **Read-heavy**: Only `schedule_post` writes data; all other actions are read-only
- **Rate limiting**: Should be added if this endpoint is exposed (uses the same IP as public site)
- **HTTPS only**: Production endpoint at `https://kyndacoffee.com/api/admin/agent`

## Available Actions

| Action | Type | Description |
|:-------|:-----|:------------|
| `status` | Read | Store open/closed, today + weekly revenue/orders, pending count |
| `marketing_summary` | Read | Recent social posts, upcoming scheduled posts, publish stats |
| `schedule_post` | Write | Create scheduled social post or draft (platform, text, time) |
| `catalog_overview` | Read | Product count by category, avg prices, low-stock alerts |
| `recent_orders` | Read | Last N orders (sanitized — status, total, fulfillment mode only) |
| `insights` | Read | 30-day analysis: top products, peak hours/days, fulfillment split, growth |

## Setup

1. Generate key: `openssl rand -hex 32`
2. Add to Coolify env vars: `AGENT_API_KEY=<key>`
3. Add to local ~/.hermes/.env: `KYNDA_AGENT_KEY=<same key>` (for the Hermes skill)
4. Redeploy on Coolify to pick up the new env var

## Payment & Order Flow Documentation

### How Orders Are Processed

The Kynda platform handles two distinct order types:

#### 1. Café Orders (Food & Drinks)
- **Source**: `/menu` page, `/kiosk`, QR table ordering, "Build Your Own"
- **Payment**: Stripe Checkout (online) or Pay-at-Counter (Square POS)
- **Fulfillment**: In-store — pickup, curbside, table, parking
- **Delivery**: Handled by DoorDash/Uber Eats (customer redirected to their platforms)

**Order Flow:**
1. Customer adds items to menu cart
2. Selects fulfillment mode (pickup/curbside/table/parking/delivery)
3. Submits order to `/api/orders/submit`
4. If paying online: redirected to Stripe Checkout
5. On payment success: order status → `confirmed`, appears in admin KDS
6. Staff sees order in `/admin/kds` with fulfillment mode + vehicle/table info

**Where orders appear:**
- Staff: `/admin/kds` (Kitchen Display System) — real-time queue
- Admin: `/admin/orders` — full order history with status management
- Customer: `/account/orders` — order history + status tracking

#### 2. Merch Orders (Custom Designs + Printful)
- **Source**: `/studio` (Design Studio), `/shop/merch/checkout`
- **Payment**: Stripe Checkout only (always online)
- **Fulfillment**: Printful print-on-demand (dropship direct to customer)

**Order Flow:**
1. Customer designs merch in `/studio`
2. Adds to cart with variant selection
3. Checks out via `/shop/merch/checkout`
4. Stripe payment → triggers printful order confirmation webhook
5. Printful manufactures + ships direct to customer
6. Webhook updates order status + sends shipping notification

**Where orders appear:**
- Admin: `/admin/orders` (with Printful order ID)
- Customer: `/account/orders` + email shipping notification
- Printful dashboard: production + fulfillment tracking

### Payment Processors

| Processor | Use Case | When Used |
|:----------|:---------|:----------|
| **Stripe** | All online payments | Café orders (online pay), merch orders, subscriptions |
| **Square** | In-person POS | Counter orders, kiosk, pay-at-counter QR orders |

**Key point**: Café customers who choose "pay at counter" are processed through Square POS at the register. All online payments (including café orders with online pay option) go through Stripe.

### Do We Need DoorDash/Uber Eats API Integration?

**No API integration needed.** The current setup is correct for a small café:
- `/menu` shows DoorDash and Uber Eats buttons that link to the Kynda storefront on those platforms
- Delivery orders are managed entirely within DoorDash/Uber Eats (their drivers, their tracking)
- No need to sync delivery orders into the Kynda platform — they're separate revenue streams
- If volume grows, DoorDash Drive API could be integrated for self-managed delivery, but that's overkill for current scale

### Order Tracking Summary

| Order Type | Payment | Tracking | Staff Visibility |
|:-----------|:--------|:---------|:-----------------|
| Café pickup/curbside | Stripe or Square | `/admin/kds` | Real-time KDS queue |
| Café table (QR) | Stripe or Square | `/admin/kds` | Table number + order |
| Merch (Printful) | Stripe | `/admin/orders` | Status + Printful tracking |
| Subscriptions | Stripe | `/admin/subscriptions` | Next delivery + frequency |
| Delivery | DoorDash/Uber | Their platforms | Not in Kynda system |

### Future: Order Consolidation

If Square is swapped for Toast or another POS:
1. The POS abstraction layer (`src/lib/pos/`) isolates the swap to `src/lib/pos/square-adapter.ts` → `toast-adapter.ts`
2. The KDS reads from Supabase `orders` table, not directly from POS
3. Online orders (Stripe) already go to Supabase, so they'd appear regardless of POS choice
4. Only in-person POS orders would change provider

## Recommended Next Steps

1. **Add Sentry error tracking** — catch API failures, webhook issues, frontend errors
2. **Add PostHog analytics** — understand customer behavior, funnel drop-off, popular products
3. **Build POS abstraction** — decouple from Square for future flexibility
4. **Expand agent capabilities** — add write actions (update product, send promotion) with proper audit logging

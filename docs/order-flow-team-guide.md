# Order Flow — Team Guide (June 2026)

One page for the Kynda team: where orders come from, where to watch them, and
how to work them. Updated after the cross-platform order unification build.

---

## TL;DR for the team

**Watch ONE screen: the KDS** (`kyndacoffee.com/kds` on the counter iPad).
Every order from every channel lands there:

| Channel | How it arrives | On the KDS? | Also visible in Square? |
|---|---|---|---|
| Walk-up at the counter (Square POS) | Rung up on Square | ✅ (via webhook) | ✅ native |
| QR table/lobby/parking orders | kyndacoffee.com/menu | ✅ instant | ✅ (pushed upstream) |
| Online pickup orders | kyndacoffee.com | ✅ instant | ✅ (pushed upstream) |
| AI-agent orders (customer's assistant orders for them) | /api/agent/orders | ✅ instant (channel: AGENT) | ✅ (pushed upstream) |
| Shipped orders (beans/merch) | Stripe checkout / Printful | ❌ (not kitchen work) | — admin /admin/orders |

Square is no longer the only place to look — but everything still shows up
there too, so Square Dashboard reporting includes online sales.

## How the sync works (for the curious)

1. **Online → Square (upstream push):** when an online/QR/agent order is
   submitted, the platform immediately creates a matching Square order
   (source "Kynda Online", PICKUP fulfillment, customer name + phone on the
   ticket). If Square is briefly down, the order still works — Square is a
   mirror, our platform is the source of truth for online orders.
2. **Square POS → KDS (webhook):** when an order is rung up on Square POS,
   Square notifies the platform and the order appears on the KDS with the
   POS badge. Counter staff don't need to do anything different.
3. **Echo protection:** orders we push to Square come back to us via the
   same webhook; the platform recognizes its own orders and ignores the echo.

## Working an order on the KDS

Statuses flow: pending → Accept → Start → Ready → Complete.
- **Accept** = we've seen it (customer's tracker updates).
- **Ready** on a pickup/parking/table order fires the customer SMS
  automatically ("your order is ready").
- **Pay at counter** orders show the payment badge — collect when they arrive.
- **AGENT channel** orders are normal customer orders placed by an AI
  assistant on the customer's behalf. Treat exactly like a pickup order —
  name and phone are on the ticket.

## If something looks wrong

- Order on Square but not the KDS → check it was rung as a sale (not an
  open ticket); webhook only fires on committed orders.
- Order on KDS but not in Square → Square may have been briefly unreachable
  at push time. The order is still real — work it from the KDS.
- Duplicate-looking orders in Square → one is the Kynda Online mirror of the
  other only if BOTH say Kynda Online; genuine POS orders never duplicate.
  Flag for Jonathan if you see a true duplicate.

## Agent ordering (what it is)

Customers can tell their AI assistant (ChatGPT, Claude, etc.) "order me a
latte from Kynda" and the assistant places the order through our public
agent API (discoverable at kyndacoffee.com/.well-known/agent.json). Orders
are validated against the live menu (no fake items/prices), rate-limited,
and require a real name + phone/email — so to the team they look like any
other pickup ticket. Payment: at the counter, or prepaid via Stripe link.

Shipped goods work the same way: agents browse /api/products and check out
through Stripe (which collects address + payment from the human).

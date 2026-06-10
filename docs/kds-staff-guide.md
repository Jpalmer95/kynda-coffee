# Kynda Coffee — KDS Staff Guide

**The Kitchen Display System (KDS) is the one screen the whole team watches.**
Open it on the counter iPad at: **kyndacoffee.com/kds**

Every order — walk-up Square POS, QR codes at tables, online pickup, even
AI-assistant orders — lands on this screen the moment it's placed.

---

## The 3-tap order lifecycle

Every order card has ONE big button. You tap it three times over the life of
an order:

```
  NEW  ──tap──▶  PREPARING  ──tap──▶  READY  ──tap──▶  (off the board)
       Start              Mark                Picked
       Preparing          Ready               Up
```

1. **Start Preparing** — tap when you begin making the order.
   The card turns from red (New) to bronze (Preparing). The customer's
   online tracker updates to "being prepared."

2. **Mark Ready** — tap when the order is made and on the handoff counter.
   *This automatically texts the customer* ("your order is ready"), so only
   tap it when it's truly ready. For curbside orders the text says we're
   bringing it out — start walking.

3. **Picked Up** — tap when the customer (or runner) has the order in hand.
   The card leaves the board. Done.

**Made a mistake?** Cards in Ready have a small "Back to Preparing" button —
use it if you bumped Ready too early. (The customer may already have the
text, so give them a heads-up at handoff if the wait grows.)

**Do we have to do this for every order?** Yes — that's the whole system.
Three taps per order keeps the customer informed automatically (no phone
calls!), keeps the queue honest, and gives Jonathan real prep-time numbers.
It becomes muscle memory by day two.

---

## Reading an order card

Each card shows, top to bottom:

| What | Where | Why you care |
|---|---|---|
| Order # + time placed | top line | "the 2:41 latte" when talking to a teammate |
| Customer name (+ phone) | big bold line | call the name at handoff |
| Channel badge | colored chip | **QR** / **ONLINE** / **AGENT** / **POS** — where it came from |
| Fulfillment chip | colored chip | **Pickup**, **Table 12**, **Curbside**, **Lobby**, **Delivery** |
| Payment chip | colored chip | **PAID** (green) = hand it over. **PAY AT REGISTER** (yellow, kiosk only) = collect before handoff! |
| Timer | colored chip | minutes since ordered: green → amber (8m) → flashing red (15m). Work oldest/red first. |
| Vehicle callout | amber box | curbside orders: the car description — what to look for in the lot |
| The items | the list | every drink/food with **all modifiers** listed under it (`+ Oat milk`, `+ Iced`...) and any special-request note highlighted in yellow |
| Items count + total | bottom line | quick sanity check |

**Modifiers are the recipe.** A latte card that says
`+ Iced`, `+ House Made Brown Sugar Syrup`, `+ Oat milk` is an iced brown
sugar oat milk latte. If a card ever shows something unreadable, tell
Jonathan — that's a bug, not your fault.

---

## The chips, decoded

**Channel badges** (where the order came from):
- **POS** (dark grey) — rung up at our own register. Already paid in Square.
- **QR** (blue) — customer scanned the table/lobby QR code and ordered from
  their phone.
- **ONLINE** (grey) — placed on kyndacoffee.com.
- **AGENT** (pink) — placed by the customer's AI assistant on their behalf.
  Totally normal order: real name, real phone, validated against our real
  menu. Treat it exactly like a pickup.

**Payment chips:**
- **PAID** (green) — money is collected. Make it, hand it over.
- **PAY AT REGISTER** (yellow) — only appears on staff-attended **kiosk**
  orders. Collect payment when the customer steps up, *before* handing off.
- POS orders never show a chip (Square already handled it).

**Important: online orders are always prepaid.** If a customer orders from
the website, a QR code, or an AI assistant and doesn't finish paying, the
order **never appears on the KDS** — the kitchen only sees paid remote
orders. Cash is for the physical register only. So with the exception of
kiosk tickets, every card on your board is already paid for.

---

## Boards, search, and sound

- **Board tabs** (top of screen): All Orders / Pickup / Curbside / Dine-In /
  Delivery. The counter iPad usually stays on **All Orders**. A second
  tablet can be pinned to one board (e.g. Curbside) by bookmarking
  `kyndacoffee.com/kds?board=parking`.
- **Search box**: type a name, order #, vehicle ("blue truck"), or item to
  find a card fast during a rush.
- **Alerts On** (bell button): tap it once at the start of your shift —
  this turns on the new-order chime. iPads require that one tap before they
  allow sound, so make it part of opening. You'll hear a "ding-ding" and see
  a green banner whenever a new order lands.
- **LIVE / POLLING** indicator: LIVE (green) means orders appear instantly.
  POLLING (amber) means the live connection dropped and the screen refreshes
  every 30 seconds instead — it self-heals, but mention it to Jonathan if it
  stays amber all day.

---

## Stats strip (top of screen)

In Queue / Avg Wait / Longest / Fresh / Aging / Late — a live picture of how
the queue is moving. If **Late** is climbing, rally: work the flashing red
cards first.

---

## Square is still there

Everything still flows into Square too (including online orders, as "Kynda
Online"), so reports and end-of-day stay unified. But **the KDS is the
operational source of truth** — work orders from the KDS, not the Square
screen.

What that means at the register:
- Ring up walk-ups on Square exactly like always. The order will also pop
  onto the KDS with a POS badge — bump it through the same 3 taps.
- Never re-ring an online order into Square — it's already mirrored there.

---

## If something looks wrong

| Symptom | What to do |
|---|---|
| "Failed to update order" when tapping a button | Tap Refresh and try again. If it persists, screenshot the message and text Jonathan. |
| Order in Square but not on the KDS | Confirm it was rung as a completed sale (not an open ticket), then tap Refresh. |
| Order on KDS but not in Square | It's still a real order — make it. (Square was briefly unreachable when it was placed.) |
| Card stuck / wrong status | "Back to Preparing" un-does a Ready bump. Anything else, tell Jonathan. |
| No chime on new orders | Tap the bell button (Alerts On). iPads need one tap per session to allow sound. |
| Screen frozen | Pull-to-refresh or reload the page; the board state lives on the server, nothing is lost. |

---

## Opening / closing checklist

**Opening:**
1. Open kyndacoffee.com/kds on the counter iPad (log in if asked).
2. Tap **Alerts On** (hear the confirmation ding).
3. Confirm the indicator says **LIVE**.
4. Clear any stale test orders with Jonathan if any are sitting there.

**Closing:**
1. Make sure no cards are stranded in New/Preparing/Ready — every real
   order should be bumped off the board.
2. That's it. The screen can sleep; orders queue server-side overnight.

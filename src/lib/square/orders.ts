import { randomUUID } from "node:crypto";
import { squareOrders } from "./client";

/**
 * Square upstream order push — mirrors online (Menu/QR/agent) orders into
 * Square Orders so the team sees EVERY order inside the Square ecosystem
 * (Dashboard → Orders, Square POS, Square KDS app) alongside walk-up POS sales.
 *
 * Design rules:
 *  - Best-effort: a Square outage must NEVER block or fail a customer order.
 *    Callers fire-and-forget (or await + ignore errors) — Supabase remains the
 *    source of truth; Square is a mirror for team visibility.
 *  - Echo-loop safe: we stamp the resulting square_order_id back onto the
 *    Kynda order row, and the Square webhook skips orders whose
 *    square_order_id belongs to a Kynda-originated row (source != square-pos).
 *  - Catalog-aware: line items reference Square catalog variation IDs when the
 *    item came from the Square catalog sync, so Square reporting groups them
 *    with POS sales of the same item. Non-Square items fall back to ad-hoc
 *    line items with explicit prices.
 */

interface KyndaOrderItemLike {
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  provider?: string;
  provider_variation_id?: string;
  modifiers?: Array<{ name: string; price_cents: number }>;
  notes?: string;
}

export interface KyndaOrderLike {
  id: string;
  order_number: string;
  items: KyndaOrderItemLike[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  notes?: string | null;
  fulfillment_metadata?: {
    mode?: string;
    label?: string;
    customer_name?: string;
    customer_phone?: string;
    payment_preference?: string;
    [key: string]: unknown;
  } | null;
}

export interface SquarePushResult {
  ok: boolean;
  squareOrderId?: string;
  error?: string;
}

export function isSquareOrderPushEnabled(): boolean {
  return (
    Boolean(process.env.SQUARE_ACCESS_TOKEN) &&
    Boolean(process.env.SQUARE_LOCATION_ID) &&
    process.env.SQUARE_ORDER_PUSH !== "off"
  );
}

function pickupNote(order: KyndaOrderLike): string {
  const fm = order.fulfillment_metadata ?? {};
  const parts: string[] = [`Kynda online order ${order.order_number}`];
  if (fm.mode) parts.push(`mode: ${fm.mode}`);
  if (fm.label) parts.push(String(fm.label));
  const pref = fm.payment_preference;
  if (pref && pref !== "stripe" && pref !== "online") parts.push("PAY AT COUNTER");
  if (order.notes) parts.push(`notes: ${order.notes}`);
  return parts.join(" | ").slice(0, 500);
}

function lineItemFor(item: KyndaOrderItemLike) {
  const quantity = String(Math.max(1, Math.round(item.quantity)));
  const note = [
    item.modifiers?.length ? item.modifiers.map((m) => m.name).join(", ") : "",
    item.notes ?? "",
  ]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 500) || undefined;

  // Modifier prices are folded into unit price for ad-hoc items; for
  // catalog-linked items we keep the catalog variation and add the modifier
  // delta as an explicit per-unit adjustment via basePriceMoney override.
  const modifierCents = (item.modifiers ?? []).reduce((s, m) => s + (m.price_cents || 0), 0);
  const unitCents = item.unit_price_cents + modifierCents;

  if (item.provider === "square" && item.provider_variation_id) {
    return {
      catalogObjectId: item.provider_variation_id,
      quantity,
      note,
      // Override price when modifiers shift it; otherwise let catalog price rule.
      ...(modifierCents > 0
        ? { basePriceMoney: { amount: BigInt(unitCents), currency: "USD" as const } }
        : {}),
    };
  }

  const name = item.variant_name && item.variant_name !== "Default"
    ? `${item.product_name} (${item.variant_name})`
    : item.product_name;

  return {
    name: name.slice(0, 255),
    quantity,
    note,
    basePriceMoney: { amount: BigInt(unitCents), currency: "USD" as const },
  };
}

/**
 * Push a Kynda-originated order upstream into Square as an OPEN order with a
 * PICKUP fulfillment. Returns the Square order id on success. Never throws.
 */
export async function pushOrderToSquare(order: KyndaOrderLike): Promise<SquarePushResult> {
  if (!isSquareOrderPushEnabled()) {
    return { ok: false, error: "square order push not configured" };
  }

  try {
    const fm = order.fulfillment_metadata ?? {};
    const recipientName = (fm.customer_name as string) || "Online Customer";

    const { result } = await squareOrders().createOrder({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        referenceId: order.order_number.slice(0, 40),
        source: { name: "Kynda Online" },
        lineItems: order.items.map(lineItemFor),
        fulfillments: [
          {
            type: "PICKUP",
            state: "PROPOSED",
            pickupDetails: {
              recipient: {
                displayName: recipientName.slice(0, 255),
                ...(fm.customer_phone
                  ? { phoneNumber: String(fm.customer_phone).slice(0, 17) }
                  : {}),
              },
              note: pickupNote(order),
              // ASAP pickup — team works it from the KDS / Square Orders board.
              scheduleType: "ASAP",
            },
          },
        ],
        // Mirror tax already charged online as an order-level percentage tax
        // (Square computes amounts from percentage; appliedMoney is read-only).
        // Percentage is derived from what we actually charged so totals match.
        ...(order.tax_cents > 0 && order.subtotal_cents > 0
          ? {
              taxes: [
                {
                  uid: "kynda-online-tax",
                  name: "Sales Tax (collected online)",
                  type: "ADDITIVE",
                  percentage: ((order.tax_cents / order.subtotal_cents) * 100).toFixed(4),
                  scope: "ORDER",
                },
              ],
            }
          : {}),
      },
    });

    const squareOrderId = result.order?.id;
    if (!squareOrderId) {
      return { ok: false, error: "Square returned no order id" };
    }
    return { ok: true, squareOrderId };
  } catch (err) {
    console.error("[square/orders] push failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

import type Stripe from "stripe";
import type { PaymentStatus } from "./payment";

export interface StripePayableOrderItem {
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  modifiers?: Array<{ name: string; price_cents?: number }>;
  notes?: string;
}

export interface StripePayableOrder {
  id: string;
  order_number: string;
  email: string;
  source?: string | null;
  order_channel?: string | null;
  payment_status?: PaymentStatus | null;
  total_cents: number;
  items: StripePayableOrderItem[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const QR_PAYMENT_CHANNELS = new Set(["qr", "pickup", "table", "lobby", "parking"]);

export function canCreateStripePaymentForOrder(order: StripePayableOrder): Result<true> {
  if (order.payment_status === "paid") return { ok: false, error: "Order is already paid." };
  if (order.payment_status === "refunded" || order.payment_status === "void") {
    return { ok: false, error: `Cannot pay an order with payment status ${order.payment_status}.` };
  }
  if (order.total_cents <= 0) return { ok: false, error: "Order total must be greater than zero." };
  if (order.source !== "qr" && !QR_PAYMENT_CHANNELS.has(order.order_channel ?? "")) {
    return { ok: false, error: "Only QR, pickup, table, lobby, and parking orders can use this payment path." };
  }
  if (!order.items.length) return { ok: false, error: "Order has no items." };
  return { ok: true, value: true };
}

function itemName(item: StripePayableOrderItem): string {
  return item.variant_name ? `${item.product_name} — ${item.variant_name}` : item.product_name;
}

function itemDescription(item: StripePayableOrderItem): string | undefined {
  const modifiers = (item.modifiers ?? []).map((modifier) => modifier.name).filter(Boolean).join(", ");
  const note = item.notes ? `Note: ${item.notes}` : "";
  return [modifiers, note].filter(Boolean).join(" · ") || undefined;
}

export function buildStripeLineItemsForOrder(order: StripePayableOrder): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return order.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: itemName(item),
        ...(itemDescription(item) ? { description: itemDescription(item) } : {}),
      },
      unit_amount: item.unit_price_cents,
    },
    quantity: item.quantity,
  }));
}

export function buildStripeOrderMetadata(order: StripePayableOrder): Record<string, string> {
  return {
    source: "kynda-qr-order",
    order_id: order.id,
    order_number: order.order_number,
  };
}

export function stripeSuccessUrl(origin: string, order: Pick<StripePayableOrder, "id">): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/qr-order?payment=success&order_id=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
}

export function stripeCancelUrl(origin: string, order: Pick<StripePayableOrder, "id">): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/qr-order?payment=cancelled&order_id=${encodeURIComponent(order.id)}`;
}

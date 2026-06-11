import type { OrderStatus } from "@/types";

// "ready" stays on the board until handoff (Picked Up) so staff always see
// what's waiting at the counter — it only disappears once marked complete.
export const ACTIVE_KDS_STATUSES = ["pending", "confirmed", "processing", "ready"] as const satisfies OrderStatus[];
export type ActiveKdsStatus = (typeof ACTIVE_KDS_STATUSES)[number];

export const KDS_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  shipped: ["delivered"],
  // "processing" is the undo path for an accidental Ready bump.
  ready: ["complete", "fulfilled", "processing", "cancelled"],
  // "ready" is the undo path for an accidental Picked Up bump — the KDS shows
  // a Recently Completed rail so staff can bring a ticket back within the hour.
  complete: ["fulfilled", "delivered", "shipped", "ready"],
  fulfilled: [],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const KDS_CHANNELS = new Set(["qr", "pickup", "table", "lobby", "parking", "delivery", "pos", "agent"]);

/**
 * Prepaid-only rule (owner directive 2026-06-10): remote/online orders must be
 * PAID before the kitchen sees them — no making drinks for no-shows, no fraud
 * exposure. Cash/pay-at-counter exists ONLY for in-person surfaces:
 *   - Square POS orders (settled inside Square)
 *   - the staff-attended in-store kiosk (label "Kiosk")
 * Everything else is held off the KDS until the Stripe webhook marks it paid.
 */
export function isHeldForPayment(order: KdsOrderLike): boolean {
  // In-person surfaces are exempt.
  if (order.source === "square-pos" || order.order_channel === "pos") return false;
  if (order.fulfillment_metadata?.label === "Kiosk") return false;
  return order.payment_status !== "paid";
}

export interface KdsOrderLike {
  id: string;
  order_number: string;
  status: OrderStatus;
  source: string;
  order_channel?: string | null;
  created_at: string;
  total_cents: number;
  items: unknown[];
  payment_status?: string | null;
  payment_preference?: string | null;
  fulfillment_metadata?: {
    mode?: string;
    label?: string;
    customer_name?: string;
    customer_phone?: string;
    payment_preference?: string;
    [key: string]: unknown;
  } | null;
}

export interface KdsAction {
  status: OrderStatus;
  label: string;
  tone: "primary" | "secondary" | "danger";
}

export type KdsTransitionResult = { ok: true } | { ok: false; error: string };

function isActiveStatus(status: OrderStatus): status is ActiveKdsStatus {
  return ACTIVE_KDS_STATUSES.includes(status as ActiveKdsStatus);
}

export function isActiveKdsOrder(order: KdsOrderLike): boolean {
  if (!isActiveStatus(order.status)) return false;
  // Prepaid-only: unpaid remote orders are invisible to the kitchen until
  // Stripe confirms payment (in-person POS/kiosk orders are exempt).
  if (isHeldForPayment(order)) return false;
  if (order.source === "qr") return true;
  return KDS_CHANNELS.has(order.order_channel ?? "");
}

export function sortKdsOrders<T extends KdsOrderLike>(orders: T[]): T[] {
  return orders
    .filter(isActiveKdsOrder)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function getKdsNextActions(status: OrderStatus): KdsAction[] {
  return (KDS_STATUS_TRANSITIONS[status] ?? []).map((next) => {
    if (next === "cancelled") return { status: next, label: "Cancel", tone: "danger" };
    if (next === "confirmed") return { status: next, label: "Accept", tone: "secondary" };
    if (next === "processing") return { status: next, label: "Start", tone: "primary" };
    if (next === "ready" || next === "complete" || next === "fulfilled" || next === "delivered") return { status: next, label: "Complete", tone: "primary" };
    return { status: next, label: next, tone: "secondary" };
  });
}

export function assertKdsTransition(current: OrderStatus, next: OrderStatus): KdsTransitionResult {
  if ((KDS_STATUS_TRANSITIONS[current] ?? []).includes(next)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: `Cannot move order from ${current} to ${next}.`,
  };
}

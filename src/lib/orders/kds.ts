import type { OrderStatus } from "@/types";

export const ACTIVE_KDS_STATUSES = ["pending", "confirmed", "processing"] as const satisfies OrderStatus[];
export type ActiveKdsStatus = (typeof ACTIVE_KDS_STATUSES)[number];

export const KDS_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["delivered", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const KDS_CHANNELS = new Set(["qr", "pickup", "table", "lobby", "parking"]);

export interface KdsOrderLike {
  id: string;
  order_number: string;
  status: OrderStatus;
  source: string;
  order_channel?: string | null;
  created_at: string;
  total_cents: number;
  items: unknown[];
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
    if (next === "delivered") return { status: next, label: "Complete", tone: "primary" };
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

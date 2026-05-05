export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded" | "void";
export type PaymentMethod = "unknown" | "pay_at_counter" | "cash" | "card" | "stripe" | "square" | "comp" | "gift_card";

export interface PaymentEvent {
  status: PaymentStatus;
  method: PaymentMethod;
  actor: string;
  at: string;
  note?: string;
}

export interface PaymentMetadata {
  payment_events?: PaymentEvent[];
  [key: string]: unknown;
}

export interface PaymentOrderLike {
  id: string;
  total_cents: number;
  payment_status?: PaymentStatus | null;
  payment_method?: PaymentMethod | string | null;
  payment_preference?: string | null;
  payment_metadata?: PaymentMetadata | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  square_order_id?: string | null;
  paid_at?: string | null;
}

export interface PaymentBadge {
  label: string;
  tone: "warning" | "success" | "neutral" | "danger";
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ["paid", "void"],
  paid: ["refunded", "partially_refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  void: [],
};

export function normalizePaymentStatus(order: PaymentOrderLike): PaymentStatus {
  if (order.payment_status) return order.payment_status;
  if (order.stripe_payment_intent_id || order.stripe_checkout_session_id) return "paid";
  return "unpaid";
}

export function isPaid(order: PaymentOrderLike): boolean {
  const status = normalizePaymentStatus(order);
  return status === "paid" || status === "partially_refunded";
}

export function getPaymentBadge(order: PaymentOrderLike): PaymentBadge {
  const status = normalizePaymentStatus(order);
  const method = order.payment_method && order.payment_method !== "unknown" ? String(order.payment_method) : "";

  if (status === "paid") return { label: `Paid${method ? ` · ${method}` : ""}`, tone: "success" };
  if (status === "partially_refunded") return { label: "Partially refunded", tone: "neutral" };
  if (status === "refunded") return { label: "Refunded", tone: "neutral" };
  if (status === "void") return { label: "Void", tone: "danger" };
  return { label: "Unpaid", tone: "warning" };
}

function assertPaymentTransition(current: PaymentStatus, next: PaymentStatus): Result<true> {
  if ((PAYMENT_STATUS_TRANSITIONS[current] ?? []).includes(next)) return { ok: true, value: true };
  if (current === next) return { ok: true, value: true };
  return { ok: false, error: `Cannot move payment from ${current} to ${next}.` };
}

function normalizeMethod(method: string | undefined, nextStatus: PaymentStatus): PaymentMethod {
  if (method === "cash" || method === "card" || method === "stripe" || method === "square" || method === "comp" || method === "gift_card" || method === "pay_at_counter") {
    return method;
  }
  if (nextStatus === "paid") return "pay_at_counter";
  return "unknown";
}

export function buildPaymentUpdate({
  order,
  nextStatus,
  method,
  actor,
  note,
  now = new Date(),
}: {
  order: PaymentOrderLike;
  nextStatus: PaymentStatus;
  method?: string;
  actor: string;
  note?: string;
  now?: Date;
}): Result<{
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  paid_at: string | null;
  payment_metadata: PaymentMetadata;
}> {
  const currentStatus = normalizePaymentStatus(order);
  const transition = assertPaymentTransition(currentStatus, nextStatus);
  if (!transition.ok) return transition;

  const at = now.toISOString();
  const paymentMethod = normalizeMethod(method, nextStatus);
  const existingMetadata = order.payment_metadata ?? {};
  const existingEvents = Array.isArray(existingMetadata.payment_events)
    ? existingMetadata.payment_events
    : [];

  const event: PaymentEvent = {
    status: nextStatus,
    method: paymentMethod,
    actor,
    at,
    ...(note?.trim() ? { note: note.trim() } : {}),
  };

  return {
    ok: true,
    value: {
      payment_status: nextStatus,
      payment_method: paymentMethod,
      paid_at: nextStatus === "paid" ? at : order.paid_at ?? null,
      payment_metadata: {
        ...existingMetadata,
        payment_events: [...existingEvents, event],
      },
    },
  };
}

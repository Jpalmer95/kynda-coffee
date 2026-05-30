import type { OrderStatus } from "@/types";
import type { KdsOrderLike } from "@/lib/orders/kds";

/**
 * Smart KDS board logic (Roadmap V2 — Epic 3).
 *
 * Pure, unit-testable helpers that power a multi-station Kitchen Display System:
 * fulfillment tagging, board filtering (one screen for all orders, others
 * filtered to curbside / table / delivery), prep-time stats, and timer
 * escalation. The UI stays a thin shell over these functions.
 */

/** A KDS "board" = a filtered view a given tablet/display is pinned to. */
export type KdsBoard = "all" | "pickup" | "parking" | "table" | "delivery" | "lobby";

export interface KdsBoardDef {
  key: KdsBoard;
  label: string;
  /** fulfillment modes / order_channels this board includes ("*" = everything). */
  matches: string[];
}

/** Board presets. A tablet bookmarks /(kds)?board=parking etc. */
export const KDS_BOARDS: KdsBoardDef[] = [
  { key: "all", label: "All Orders", matches: ["*"] },
  { key: "pickup", label: "Pickup", matches: ["pickup"] },
  { key: "parking", label: "Curbside", matches: ["parking"] },
  { key: "table", label: "Dine-In", matches: ["table", "lobby"] },
  { key: "delivery", label: "Delivery", matches: ["delivery"] },
];

/** Human-facing fulfillment tag shown on each order card. */
export interface FulfillmentTag {
  /** canonical mode key */
  mode: string;
  /** short label e.g. "Curbside", "Table 12", "Pickup" */
  label: string;
  /** tailwind class for the tag chip */
  className: string;
  /** the descriptive detail (vehicle description, table number, etc.) if any */
  detail?: string;
}

/** Resolve the order's fulfillment mode from metadata/channel, normalized. */
export function resolveMode(order: KdsOrderLike): string {
  const metaMode = order.fulfillment_metadata?.mode;
  if (typeof metaMode === "string" && metaMode) return metaMode;
  if (order.order_channel) return order.order_channel;
  if (order.source === "qr") return "pickup";
  return "pickup";
}

const MODE_PRESENTATION: Record<string, { label: string; className: string }> = {
  pickup: { label: "Pickup", className: "bg-sky-600 text-white" },
  parking: { label: "Curbside", className: "bg-amber-500 text-black" },
  table: { label: "Dine-In", className: "bg-violet-600 text-white" },
  lobby: { label: "Lobby", className: "bg-violet-600 text-white" },
  delivery: { label: "Delivery", className: "bg-emerald-600 text-white" },
  qr: { label: "QR Order", className: "bg-sky-600 text-white" },
  web: { label: "Online", className: "bg-slate-600 text-white" },
};

/**
 * Build the fulfillment tag for an order card. For table orders the detail is
 * the table number; for curbside (parking) the detail is the vehicle/spot
 * description — exactly what staff need to walk the order out.
 */
export function fulfillmentTag(order: KdsOrderLike): FulfillmentTag {
  const mode = resolveMode(order);
  const pres = MODE_PRESENTATION[mode] ?? { label: mode, className: "bg-slate-600 text-white" };
  const label = order.fulfillment_metadata?.label;
  const detail = typeof label === "string" && label.trim() ? label.trim() : undefined;

  let displayLabel = pres.label;
  if (mode === "table" && detail) displayLabel = `Table ${detail}`;

  return { mode, label: displayLabel, className: pres.className, detail };
}

/** Does this order belong on the given board? */
export function orderMatchesBoard(order: KdsOrderLike, board: KdsBoard): boolean {
  if (board === "all") return true;
  const def = KDS_BOARDS.find((b) => b.key === board);
  if (!def) return true;
  if (def.matches.includes("*")) return true;
  return def.matches.includes(resolveMode(order));
}

/** Filter a list of orders to a board, optionally with a text search query. */
export function filterOrdersForBoard<T extends KdsOrderLike>(
  orders: T[],
  board: KdsBoard,
  query = ""
): T[] {
  const q = query.trim().toLowerCase();
  return orders.filter((o) => {
    if (!orderMatchesBoard(o, board)) return false;
    if (!q) return true;
    const haystack = [
      o.order_number,
      o.fulfillment_metadata?.customer_name,
      o.fulfillment_metadata?.label,
      resolveMode(o),
      ...((o.items as Array<{ product_name?: string; name?: string }>) ?? []).map(
        (it) => it?.product_name || it?.name || ""
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Timer escalation tier based on minutes elapsed since the order arrived. */
export type TimerTier = "fresh" | "warm" | "late";

export function timerTier(minutes: number, opts?: { warnAt?: number; lateAt?: number }): TimerTier {
  const warnAt = opts?.warnAt ?? 8;
  const lateAt = opts?.lateAt ?? 15;
  if (minutes >= lateAt) return "late";
  if (minutes >= warnAt) return "warm";
  return "fresh";
}

export const TIMER_TIER_CLASS: Record<TimerTier, string> = {
  fresh: "bg-emerald-600 text-white",
  warm: "bg-amber-500 text-black",
  late: "bg-red-600 text-white animate-pulse",
};

export function minutesSince(createdAt: string, nowMs = Date.now()): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.round((nowMs - created) / 60000));
}

/** Aggregate stats shown in the KDS header strip. */
export interface KdsStats {
  total: number;
  fresh: number;
  warm: number;
  late: number;
  avgWaitMinutes: number;
  longestWaitMinutes: number;
  byMode: Record<string, number>;
}

export function computeKdsStats(orders: KdsOrderLike[], nowMs = Date.now()): KdsStats {
  if (orders.length === 0) {
    return { total: 0, fresh: 0, warm: 0, late: 0, avgWaitMinutes: 0, longestWaitMinutes: 0, byMode: {} };
  }
  let fresh = 0;
  let warm = 0;
  let late = 0;
  let sum = 0;
  let longest = 0;
  const byMode: Record<string, number> = {};

  for (const o of orders) {
    const mins = minutesSince(o.created_at, nowMs);
    sum += mins;
    if (mins > longest) longest = mins;
    const tier = timerTier(mins);
    if (tier === "fresh") fresh++;
    else if (tier === "warm") warm++;
    else late++;
    const mode = resolveMode(o);
    byMode[mode] = (byMode[mode] ?? 0) + 1;
  }

  return {
    total: orders.length,
    fresh,
    warm,
    late,
    avgWaitMinutes: Math.round(sum / orders.length),
    longestWaitMinutes: longest,
    byMode,
  };
}

/** Customer-facing status label for a KDS order. */
export function kdsStatusLabel(status: OrderStatus): string {
  if (status === "pending" || status === "confirmed") return "New";
  if (status === "processing") return "Preparing";
  if (status === "ready") return "Ready";
  return status;
}

import type { OrderStatus } from "@/types";

export interface KdsNotificationOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  source?: string | null;
  order_channel?: string | null;
}

export interface DetectNewKdsOrdersInput<T extends KdsNotificationOrder> {
  previousOrders: T[] | null;
  nextOrders: T[];
}

export interface DetectNewKdsOrdersResult<T extends KdsNotificationOrder> {
  newOrders: T[];
  knownOrderIds: Set<string>;
}

const ACTIVE_KDS_STATUSES = new Set<OrderStatus>(["pending", "confirmed", "processing"]);

export function isActiveKdsNotificationOrder(order: KdsNotificationOrder): boolean {
  return ACTIVE_KDS_STATUSES.has(order.status);
}

/**
 * POS orders (in-store Square terminal) are auto-completed by the Square
 * webhook and routed to Recently Completed. They should never trigger
 * sound alerts on the KDS — the barista is physically present and already
 * making the drink. This filter is a safety net in case a POS order
 * briefly appears in an active status between insert and update.
 */
function isPosOrder(order: KdsNotificationOrder): boolean {
  return order.source === "square-pos" || order.source === "pos" || order.order_channel === "pos";
}

export function detectNewKdsOrders<T extends KdsNotificationOrder>({
  previousOrders,
  nextOrders,
}: DetectNewKdsOrdersInput<T>): DetectNewKdsOrdersResult<T> {
  // Filter out POS orders — they go straight to Recently Completed and
  // should never trigger new-order alerts on the kitchen tablet.
  const activeNextOrders = nextOrders.filter(
    (o) => isActiveKdsNotificationOrder(o) && !isPosOrder(o)
  );
  const knownOrderIds = new Set(activeNextOrders.map((order) => order.id));

  if (previousOrders === null) {
    return { newOrders: [], knownOrderIds };
  }

  const previousActiveIds = new Set(
    previousOrders
      .filter((o) => isActiveKdsNotificationOrder(o) && !isPosOrder(o))
      .map((order) => order.id)
  );
  const newOrders = activeNextOrders.filter((order) => !previousActiveIds.has(order.id));

  return { newOrders, knownOrderIds };
}

export function shouldPlayKdsNotificationSound({
  alertsEnabled,
  newOrderCount,
}: {
  alertsEnabled: boolean;
  newOrderCount: number;
}): boolean {
  return alertsEnabled && newOrderCount > 0;
}

export function kdsNewOrderMessage(newOrders: Pick<KdsNotificationOrder, "order_number">[]): string {
  if (newOrders.length === 0) return "No new orders.";
  if (newOrders.length === 1) return `New KDS order ${newOrders[0].order_number}.`;
  return `${newOrders.length} new KDS orders: ${newOrders.map((order) => order.order_number).join(", ")}.`;
}

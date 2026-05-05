import type { OrderStatus } from "@/types";

export interface KdsNotificationOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
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

export function detectNewKdsOrders<T extends KdsNotificationOrder>({
  previousOrders,
  nextOrders,
}: DetectNewKdsOrdersInput<T>): DetectNewKdsOrdersResult<T> {
  const activeNextOrders = nextOrders.filter(isActiveKdsNotificationOrder);
  const knownOrderIds = new Set(activeNextOrders.map((order) => order.id));

  if (previousOrders === null) {
    return { newOrders: [], knownOrderIds };
  }

  const previousActiveIds = new Set(
    previousOrders.filter(isActiveKdsNotificationOrder).map((order) => order.id)
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

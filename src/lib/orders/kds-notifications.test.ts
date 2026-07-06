import { describe, it, expect } from "vitest";
import {
  detectNewKdsOrders,
  shouldPlayKdsNotificationSound,
  kdsNewOrderMessage,
  isPosOrder,
  type KdsNotificationOrder,
} from "./kds-notifications";

const baseOrder: KdsNotificationOrder = {
  id: "order-1",
  order_number: "QR-1001",
  status: "pending",
  created_at: "2026-05-05T13:00:00.000Z",
};

describe("KDS new-order notifications", () => {
  it("does not announce orders on the initial KDS load", () => {
    const result = detectNewKdsOrders({ previousOrders: null, nextOrders: [baseOrder] });

    expect(result.newOrders).toEqual([]);
    expect(result.knownOrderIds).toEqual(new Set(["order-1"]));
  });

  it("detects newly-arrived active orders after the initial load", () => {
    const result = detectNewKdsOrders({
      previousOrders: [{ ...baseOrder, id: "order-1" }],
      nextOrders: [
        { ...baseOrder, id: "order-1" },
        { ...baseOrder, id: "order-2", order_number: "QR-1002" },
      ],
    });

    expect(result.newOrders.map((order) => order.id)).toEqual(["order-2"]);
    expect(result.knownOrderIds).toEqual(new Set(["order-1", "order-2"]));
  });

  it("ignores delivered/cancelled/refunded orders and keeps known active ids stable", () => {
    const result = detectNewKdsOrders({
      previousOrders: [{ ...baseOrder, id: "order-1" }],
      nextOrders: [
        { ...baseOrder, id: "order-1", status: "processing" },
        { ...baseOrder, id: "order-2", status: "delivered" },
        { ...baseOrder, id: "order-3", status: "cancelled" },
      ],
    });

    expect(result.newOrders).toEqual([]);
    expect(result.knownOrderIds).toEqual(new Set(["order-1"]));
  });

  it("plays a sound only when alerts are enabled and new orders exist", () => {
    expect(shouldPlayKdsNotificationSound({ alertsEnabled: true, newOrderCount: 1 })).toBe(true);
    expect(shouldPlayKdsNotificationSound({ alertsEnabled: false, newOrderCount: 1 })).toBe(false);
    expect(shouldPlayKdsNotificationSound({ alertsEnabled: true, newOrderCount: 0 })).toBe(false);
  });

  it("formats new order messages correctly", () => {
    expect(kdsNewOrderMessage([])).toBe("No new orders.");
    expect(kdsNewOrderMessage([{ order_number: "QR-1001" }])).toBe("New KDS order QR-1001.");
    expect(kdsNewOrderMessage([{ order_number: "QR-1001" }, { order_number: "QR-1002" }])).toBe(
      "2 new KDS orders: QR-1001, QR-1002."
    );
  });

  it("identifies POS orders by source or channel", () => {
    expect(isPosOrder({ ...baseOrder, source: "square-pos" })).toBe(true);
    expect(isPosOrder({ ...baseOrder, source: "pos" })).toBe(true);
    expect(isPosOrder({ ...baseOrder, order_channel: "pos" })).toBe(true);
    expect(isPosOrder({ ...baseOrder, source: "square-pos", order_channel: "pos" })).toBe(true);
    // Non-POS orders return false
    expect(isPosOrder({ ...baseOrder, source: null })).toBe(false);
    expect(isPosOrder({ ...baseOrder, source: "online" })).toBe(false);
    expect(isPosOrder({ ...baseOrder, order_channel: "qr" })).toBe(false);
    expect(isPosOrder(baseOrder)).toBe(false);
  });
});

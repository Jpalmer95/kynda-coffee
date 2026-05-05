import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectNewKdsOrders,
  shouldPlayKdsNotificationSound,
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

    assert.deepEqual(result.newOrders, []);
    assert.deepEqual(result.knownOrderIds, new Set(["order-1"]));
  });

  it("detects newly-arrived active orders after the initial load", () => {
    const result = detectNewKdsOrders({
      previousOrders: [{ ...baseOrder, id: "order-1" }],
      nextOrders: [
        { ...baseOrder, id: "order-1" },
        { ...baseOrder, id: "order-2", order_number: "QR-1002" },
      ],
    });

    assert.deepEqual(result.newOrders.map((order) => order.id), ["order-2"]);
    assert.deepEqual(result.knownOrderIds, new Set(["order-1", "order-2"]));
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

    assert.deepEqual(result.newOrders, []);
    assert.deepEqual(result.knownOrderIds, new Set(["order-1"]));
  });

  it("plays a sound only when alerts are enabled and new orders exist", () => {
    assert.equal(shouldPlayKdsNotificationSound({ alertsEnabled: true, newOrderCount: 1 }), true);
    assert.equal(shouldPlayKdsNotificationSound({ alertsEnabled: false, newOrderCount: 1 }), false);
    assert.equal(shouldPlayKdsNotificationSound({ alertsEnabled: true, newOrderCount: 0 }), false);
  });
});

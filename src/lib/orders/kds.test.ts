import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_KDS_STATUSES,
  KDS_STATUS_TRANSITIONS,
  assertKdsTransition,
  getKdsNextActions,
  isActiveKdsOrder,
  sortKdsOrders,
  type KdsOrderLike,
} from "./kds";

const baseOrder: KdsOrderLike = {
  id: "order-1",
  order_number: "QR-20260505-120000",
  status: "pending",
  source: "qr",
  order_channel: "table",
  created_at: "2026-05-05T12:00:00.000Z",
  total_cents: 650,
  items: [],
  fulfillment_metadata: {
    mode: "table",
    label: "4",
    customer_name: "Jonathan",
    customer_phone: "512-555-0100",
    payment_preference: "pay_at_counter",
  },
};

describe("KDS order filtering", () => {
  it("treats pending, confirmed, and processing QR/table/lobby/parking/pickup orders as active", () => {
    assert.deepEqual(ACTIVE_KDS_STATUSES, ["pending", "confirmed", "processing"]);
    assert.equal(isActiveKdsOrder(baseOrder), true);
    assert.equal(isActiveKdsOrder({ ...baseOrder, status: "confirmed" }), true);
    assert.equal(isActiveKdsOrder({ ...baseOrder, status: "processing" }), true);
    assert.equal(isActiveKdsOrder({ ...baseOrder, status: "delivered" }), false);
    assert.equal(isActiveKdsOrder({ ...baseOrder, source: "website", order_channel: "shipping" }), false);
  });

  it("sorts active KDS orders oldest first so staff sees the queue in prep order", () => {
    const sorted = sortKdsOrders([
      { ...baseOrder, id: "new", created_at: "2026-05-05T12:10:00.000Z" },
      { ...baseOrder, id: "old", created_at: "2026-05-05T12:01:00.000Z" },
      { ...baseOrder, id: "done", status: "delivered", created_at: "2026-05-05T11:00:00.000Z" },
    ]);

    assert.deepEqual(sorted.map((order) => order.id), ["old", "new"]);
  });
});

describe("KDS status transitions", () => {
  it("allows only safe staff workflow transitions", () => {
    assert.deepEqual(KDS_STATUS_TRANSITIONS.pending, ["confirmed", "processing", "cancelled"]);
    assert.deepEqual(getKdsNextActions("pending").map((action) => action.status), ["confirmed", "processing", "cancelled"]);
    assert.deepEqual(getKdsNextActions("processing").map((action) => action.status), ["delivered", "cancelled"]);
    assert.equal(getKdsNextActions("delivered").length, 0);
  });

  it("rejects invalid or backwards transitions", () => {
    assert.equal(assertKdsTransition("pending", "processing").ok, true);
    assert.equal(assertKdsTransition("processing", "delivered").ok, true);

    const backwards = assertKdsTransition("processing", "pending");
    const invalid = assertKdsTransition("delivered", "processing");

    assert.equal(backwards.ok, false);
    assert.match(backwards.error, /cannot move/i);
    assert.equal(invalid.ok, false);
    assert.match(invalid.error, /cannot move/i);
  });
});

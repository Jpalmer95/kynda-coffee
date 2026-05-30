import { describe, it, expect } from "vitest";
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
    expect(ACTIVE_KDS_STATUSES).toEqual(["pending", "confirmed", "processing"]);
    expect(isActiveKdsOrder(baseOrder)).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "confirmed" })).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "processing" })).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "delivered" })).toBe(false);
    expect(isActiveKdsOrder({ ...baseOrder, source: "website", order_channel: "shipping" })).toBe(false);
  });

  it("sorts active KDS orders oldest first so staff sees the queue in prep order", () => {
    const sorted = sortKdsOrders([
      { ...baseOrder, id: "new", created_at: "2026-05-05T12:10:00.000Z" },
      { ...baseOrder, id: "old", created_at: "2026-05-05T12:01:00.000Z" },
      { ...baseOrder, id: "done", status: "delivered", created_at: "2026-05-05T11:00:00.000Z" },
    ]);

    expect(sorted.map((order) => order.id)).toEqual(["old", "new"]);
  });
});

describe("KDS status transitions", () => {
  it("allows only safe staff workflow transitions", () => {
    expect(KDS_STATUS_TRANSITIONS.pending).toEqual(["confirmed", "processing", "cancelled"]);
    expect(getKdsNextActions("pending").map((action) => action.status)).toEqual(["confirmed", "processing", "cancelled"]);
    expect(getKdsNextActions("processing").map((action) => action.status)).toEqual(["ready", "cancelled"]);
    expect(getKdsNextActions("delivered").length).toBe(0);
  });

  it("rejects invalid or backwards transitions", () => {
    expect(assertKdsTransition("pending", "processing").ok).toBe(true);
    expect(assertKdsTransition("processing", "ready").ok).toBe(true);

    const backwards = assertKdsTransition("processing", "pending");
    const invalid = assertKdsTransition("delivered", "processing");

    expect(backwards.ok).toBe(false);
    if (!backwards.ok) expect(backwards.error).toMatch(/cannot move/i);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toMatch(/cannot move/i);
  });
});

import { describe, it, expect } from "vitest";
import {
  ACTIVE_KDS_STATUSES,
  KDS_STATUS_TRANSITIONS,
  assertKdsTransition,
  getKdsNextActions,
  isActiveKdsOrder,
  isHeldForPayment,
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
  payment_status: "paid",
  fulfillment_metadata: {
    mode: "table",
    label: "4",
    customer_name: "Jonathan",
    customer_phone: "512-555-0100",
    payment_preference: "stripe",
  },
};

describe("KDS order filtering", () => {
  it("treats pending, confirmed, processing, and ready orders as active on the board", () => {
    expect(ACTIVE_KDS_STATUSES).toEqual(["pending", "confirmed", "processing", "ready"]);
    expect(isActiveKdsOrder(baseOrder)).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "confirmed" })).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "processing" })).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "ready" })).toBe(true);
    expect(isActiveKdsOrder({ ...baseOrder, status: "delivered" })).toBe(false);
    expect(isActiveKdsOrder({ ...baseOrder, status: "complete" })).toBe(false);
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

describe("prepaid-only rule (isHeldForPayment)", () => {
  it("holds unpaid remote orders off the KDS until Stripe confirms payment", () => {
    const unpaid = { ...baseOrder, payment_status: "unpaid" };
    expect(isHeldForPayment(unpaid)).toBe(true);
    expect(isActiveKdsOrder(unpaid)).toBe(false);
  });
  it("shows remote orders once paid", () => {
    expect(isHeldForPayment(baseOrder)).toBe(false);
    expect(isActiveKdsOrder(baseOrder)).toBe(true);
  });
  it("exempts Square POS orders (settled in Square)", () => {
    const pos = { ...baseOrder, source: "square-pos", order_channel: "pos", payment_status: "unpaid" };
    expect(isHeldForPayment(pos)).toBe(false);
    expect(isActiveKdsOrder(pos)).toBe(true);
  });
  it("exempts the staff-attended in-store kiosk", () => {
    const kiosk = {
      ...baseOrder,
      payment_status: "unpaid",
      fulfillment_metadata: { ...baseOrder.fulfillment_metadata, mode: "pickup", label: "Kiosk" },
    };
    expect(isHeldForPayment(kiosk)).toBe(false);
    expect(isActiveKdsOrder(kiosk)).toBe(true);
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
    // undo path: an accidental Ready bump can go back to preparing
    expect(assertKdsTransition("ready", "processing").ok).toBe(true);
    // handoff: ready -> complete clears the board
    expect(assertKdsTransition("ready", "complete").ok).toBe(true);
    // recovery: an accidental Picked Up can come back via Recently Completed
    expect(assertKdsTransition("complete", "ready").ok).toBe(true);

    const backwards = assertKdsTransition("processing", "pending");
    const invalid = assertKdsTransition("delivered", "processing");

    expect(backwards.ok).toBe(false);
    if (!backwards.ok) expect(backwards.error).toMatch(/cannot move/i);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toMatch(/cannot move/i);
  });
});

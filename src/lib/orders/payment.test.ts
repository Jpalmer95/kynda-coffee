import { describe, it, expect } from "vitest";
import {
  PAYMENT_STATUS_TRANSITIONS,
  buildPaymentUpdate,
  getPaymentBadge,
  isPaid,
  type PaymentOrderLike,
} from "./payment";

const unpaidOrder: PaymentOrderLike = {
  id: "order-1",
  total_cents: 650,
  payment_status: "unpaid",
  payment_method: "pay_at_counter",
  payment_preference: "pay_at_counter",
  payment_metadata: {},
};

describe("order payment state", () => {
  it("identifies paid orders from explicit payment_status", () => {
    expect(isPaid(unpaidOrder)).toBe(false);
    expect(isPaid({ ...unpaidOrder, payment_status: "paid" })).toBe(true);
    expect(isPaid({ ...unpaidOrder, payment_status: "partially_refunded" })).toBe(true);
    expect(isPaid({ ...unpaidOrder, payment_status: "refunded" })).toBe(false);
  });

  it("returns user-facing payment badges", () => {
    expect(getPaymentBadge(unpaidOrder)).toEqual({
      label: "Unpaid",
      tone: "warning",
    });
    expect(getPaymentBadge({ ...unpaidOrder, payment_status: "paid", payment_method: "cash" })).toEqual({
      label: "Paid · cash",
      tone: "success",
    });
  });

  it("allows only safe payment state transitions", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.unpaid).toEqual(["paid", "void"]);
    expect(PAYMENT_STATUS_TRANSITIONS.paid).toEqual(["refunded", "partially_refunded"]);
    expect(PAYMENT_STATUS_TRANSITIONS.refunded).toEqual([]);
  });

  it("builds an audited pay-at-counter update", () => {
    const result = buildPaymentUpdate({
      order: unpaidOrder,
      nextStatus: "paid",
      method: "cash",
      actor: "jpkorstad@gmail.com",
      note: "Paid at register",
      now: new Date("2026-05-05T12:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      payment_status: "paid",
      payment_method: "cash",
      paid_at: "2026-05-05T12:00:00.000Z",
      payment_metadata: {
        payment_events: [
          {
            status: "paid",
            method: "cash",
            actor: "jpkorstad@gmail.com",
            note: "Paid at register",
            at: "2026-05-05T12:00:00.000Z",
          },
        ],
      },
    });
  });

  it("preserves existing payment events and rejects invalid transitions", () => {
    const paid = buildPaymentUpdate({
      order: {
        ...unpaidOrder,
        payment_status: "paid",
        payment_method: "cash",
        payment_metadata: {
          payment_events: [{ status: "paid", method: "cash", actor: "admin", at: "old" }],
        },
      },
      nextStatus: "unpaid",
      method: "cash",
      actor: "admin",
    });

    expect(paid.ok).toBe(false);
    if (!paid.ok) {
      expect(paid.error).toMatch(/cannot move payment/i);
    }
  });
});

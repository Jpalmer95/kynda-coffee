import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    assert.equal(isPaid(unpaidOrder), false);
    assert.equal(isPaid({ ...unpaidOrder, payment_status: "paid" }), true);
    assert.equal(isPaid({ ...unpaidOrder, payment_status: "partially_refunded" }), true);
    assert.equal(isPaid({ ...unpaidOrder, payment_status: "refunded" }), false);
  });

  it("returns user-facing payment badges", () => {
    assert.deepEqual(getPaymentBadge(unpaidOrder), {
      label: "Unpaid",
      tone: "warning",
    });
    assert.deepEqual(getPaymentBadge({ ...unpaidOrder, payment_status: "paid", payment_method: "cash" }), {
      label: "Paid · cash",
      tone: "success",
    });
  });

  it("allows only safe payment state transitions", () => {
    assert.deepEqual(PAYMENT_STATUS_TRANSITIONS.unpaid, ["paid", "void"]);
    assert.deepEqual(PAYMENT_STATUS_TRANSITIONS.paid, ["refunded", "partially_refunded"]);
    assert.deepEqual(PAYMENT_STATUS_TRANSITIONS.refunded, []);
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

    assert.equal(result.ok, true);
    assert.deepEqual(result.value, {
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

    assert.equal(paid.ok, false);
    assert.match(paid.error, /cannot move payment/i);
  });
});

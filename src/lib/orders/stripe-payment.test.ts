import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStripeLineItemsForOrder,
  buildStripeOrderMetadata,
  canCreateStripePaymentForOrder,
  stripeSuccessUrl,
  type StripePayableOrder,
} from "./stripe-payment";

const order: StripePayableOrder = {
  id: "order-123",
  order_number: "QR-20260505-120000",
  email: "guest@example.com",
  source: "qr",
  payment_status: "unpaid",
  total_cents: 775,
  items: [
    {
      product_name: "Latte",
      variant_name: "Large",
      quantity: 1,
      unit_price_cents: 775,
      total_cents: 775,
      modifiers: [
        { name: "Oat Milk", price_cents: 75 },
        { name: "Vanilla", price_cents: 50 },
      ],
      notes: "extra hot",
    },
  ],
};

describe("Stripe payment helpers for existing QR orders", () => {
  it("allows payment sessions only for unpaid positive-total QR/pickup orders", () => {
    assert.equal(canCreateStripePaymentForOrder(order).ok, true);
    assert.equal(canCreateStripePaymentForOrder({ ...order, payment_status: "paid" }).ok, false);
    assert.match(canCreateStripePaymentForOrder({ ...order, payment_status: "paid" }).error, /already paid/i);
    assert.equal(canCreateStripePaymentForOrder({ ...order, total_cents: 0 }).ok, false);
    assert.equal(canCreateStripePaymentForOrder({ ...order, source: "website", order_channel: "shipping" }).ok, false);
  });

  it("builds Stripe line items from server-side priced order lines", () => {
    const lineItems = buildStripeLineItemsForOrder(order);

    assert.deepEqual(lineItems, [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Latte — Large",
            description: "Oat Milk, Vanilla · Note: extra hot",
          },
          unit_amount: 775,
        },
        quantity: 1,
      },
    ]);
  });

  it("builds metadata that lets Stripe webhooks update the existing order instead of creating a duplicate", () => {
    assert.deepEqual(buildStripeOrderMetadata(order), {
      source: "kynda-qr-order",
      order_id: "order-123",
      order_number: "QR-20260505-120000",
    });
  });

  it("builds stable success URLs for returning from Stripe", () => {
    assert.equal(
      stripeSuccessUrl("https://kynda.example", order),
      "https://kynda.example/qr-order?payment=success&order_id=order-123&session_id={CHECKOUT_SESSION_ID}"
    );
  });
});

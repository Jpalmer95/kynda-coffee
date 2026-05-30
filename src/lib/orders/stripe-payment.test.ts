import { describe, it, expect } from "vitest";
import {
  buildStripeLineItemsForOrder,
  buildStripeOrderMetadata,
  canCreateStripePaymentForOrder,
  stripeSuccessUrl,
  stripeCancelUrl,
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
    expect(canCreateStripePaymentForOrder(order).ok).toBe(true);

    const unpaidResult = canCreateStripePaymentForOrder({ ...order, payment_status: "paid" });
    expect(unpaidResult.ok).toBe(false);
    if (!unpaidResult.ok) expect(unpaidResult.error).toMatch(/already paid/i);

    expect(canCreateStripePaymentForOrder({ ...order, total_cents: 0 }).ok).toBe(false);
    expect(canCreateStripePaymentForOrder({ ...order, source: "website", order_channel: "shipping" }).ok).toBe(false);
  });

  it("builds Stripe line items from server-side priced order lines", () => {
    const lineItems = buildStripeLineItemsForOrder(order);

    expect(lineItems).toEqual([
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
    expect(buildStripeOrderMetadata(order)).toEqual({
      source: "kynda-qr-order",
      order_id: "order-123",
      order_number: "QR-20260505-120000",
    });
  });

  it("builds stable success URLs for returning from Stripe", () => {
    expect(stripeSuccessUrl("https://kynda.example", order)).toBe(
      "https://kynda.example/qr-order?payment=success&order_id=order-123&session_id={CHECKOUT_SESSION_ID}"
    );
  });

  it("builds stable cancel URLs for returning from Stripe", () => {
    expect(stripeCancelUrl("https://kynda.example", order)).toBe(
      "https://kynda.example/qr-order?payment=cancelled&order_id=order-123"
    );
  });
});

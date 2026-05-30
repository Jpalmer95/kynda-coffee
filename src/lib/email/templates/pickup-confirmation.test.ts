import { describe, it, expect } from "vitest";
import {
  pickupConfirmationHtml,
  pickupConfirmationSubject,
  type PickupConfirmationData,
} from "./pickup-confirmation";

function data(overrides: Partial<PickupConfirmationData> = {}): PickupConfirmationData {
  return {
    name: "Sam",
    orderNumber: "K-1042",
    items: [
      { name: "Cortado", quantity: 2, total_cents: 900 },
      { name: "Almond Croissant", quantity: 1, total_cents: 450 },
    ],
    totalCents: 1350,
    fulfillmentLabel: "Curbside pickup",
    payAtCounter: true,
    ...overrides,
  };
}

describe("pickupConfirmationSubject", () => {
  it("includes the order number", () => {
    expect(pickupConfirmationSubject("K-1042")).toContain("K-1042");
  });
});

describe("pickupConfirmationHtml", () => {
  it("renders the customer name, order number, items and total", () => {
    const html = pickupConfirmationHtml(data());
    expect(html).toContain("Sam");
    expect(html).toContain("K-1042");
    expect(html).toContain("2× Cortado");
    expect(html).toContain("Almond Croissant");
    expect(html).toContain("$13.50");
  });

  it("shows pay-at-counter copy when payAtCounter is true", () => {
    expect(pickupConfirmationHtml(data({ payAtCounter: true }))).toContain("pay at the counter");
  });

  it("shows paid copy when payAtCounter is false", () => {
    const html = pickupConfirmationHtml(data({ payAtCounter: false }));
    expect(html).toContain("payment received");
    expect(html).not.toContain("pay at the counter");
  });

  it("includes the fulfillment label when present", () => {
    expect(pickupConfirmationHtml(data({ fulfillmentLabel: "Dine-in" }))).toContain("Dine-in");
  });

  it("renders notes when provided", () => {
    expect(pickupConfirmationHtml(data({ notes: "oat milk please" }))).toContain("oat milk please");
  });

  it("escapes HTML in item names and notes (no injection)", () => {
    const html = pickupConfirmationHtml(data({ items: [{ name: "<b>x</b>", quantity: 1, total_cents: 100 }], notes: "<script>" }));
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<script>");
  });

  it("falls back to 'friend' when no name", () => {
    expect(pickupConfirmationHtml(data({ name: undefined }))).toContain("friend");
  });

  it("handles an empty item list without throwing", () => {
    const html = pickupConfirmationHtml(data({ items: [], totalCents: 0 }));
    expect(html).toContain("$0.00");
  });
});

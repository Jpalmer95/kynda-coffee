import { describe, it, expect } from "vitest";
import { computeOrderTotals } from "./totals";

describe("computeOrderTotals — subtotal", () => {
  it("sums unit price × quantity", () => {
    const r = computeOrderTotals({ lines: [{ unitPriceCents: 500, quantity: 2 }, { unitPriceCents: 300, quantity: 1 }] });
    expect(r.subtotalCents).toBe(1300);
  });

  it("treats an empty cart as zero everything", () => {
    const r = computeOrderTotals({ lines: [] });
    expect(r).toMatchObject({ subtotalCents: 0, totalCents: 0, taxCents: 0, shippingCents: 0 });
  });

  it("ignores negative/NaN unit prices and fractional quantities", () => {
    const r = computeOrderTotals({ lines: [{ unitPriceCents: -100, quantity: 2 }, { unitPriceCents: 500, quantity: 1.9 }] });
    expect(r.subtotalCents).toBe(500); // -100 floored to 0; qty 1.9 truncated to 1
  });
});

describe("computeOrderTotals — discount & loyalty clamping (the key invariant)", () => {
  it("applies a normal discount", () => {
    const r = computeOrderTotals({ lines: [{ unitPriceCents: 1000, quantity: 1 }], discountCents: 200 });
    expect(r.appliedDiscountCents).toBe(200);
    expect(r.discountedSubtotalCents).toBe(800);
  });

  it("clamps a discount larger than the subtotal", () => {
    const r = computeOrderTotals({ lines: [{ unitPriceCents: 500, quantity: 1 }], discountCents: 9999 });
    expect(r.appliedDiscountCents).toBe(500);
    expect(r.discountedSubtotalCents).toBe(0);
  });

  it("clamps loyalty to what remains after the discount (never negative order)", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      discountCents: 700,
      loyaltyValueCents: 9999, // would over-redeem
    });
    expect(r.appliedDiscountCents).toBe(700);
    expect(r.appliedLoyaltyCents).toBe(300); // only 300 left
    expect(r.discountedSubtotalCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("never produces a negative total even with absurd adjustments", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 100, quantity: 1 }],
      discountCents: 100000,
      loyaltyValueCents: 100000,
      taxRate: 0.0825,
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    expect(r.totalCents).toBe(0);
    expect(r.appliedDiscountCents).toBe(100);
    expect(r.appliedLoyaltyCents).toBe(0);
  });
});

describe("computeOrderTotals — tax", () => {
  it("taxes the discounted subtotal, not the gross", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      discountCents: 200,
      taxRate: 0.0825,
    });
    // tax on 800 = 66 (rounded)
    expect(r.taxCents).toBe(Math.round(800 * 0.0825));
  });

  it("no tax when rate is zero/absent", () => {
    expect(computeOrderTotals({ lines: [{ unitPriceCents: 1000, quantity: 1 }] }).taxCents).toBe(0);
  });
});

describe("computeOrderTotals — shipping", () => {
  it("charges flat shipping under the free threshold", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    expect(r.shippingCents).toBe(599);
  });

  it("is free at/over the threshold (measured on discounted subtotal)", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 6000, quantity: 1 }],
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    expect(r.shippingCents).toBe(0);
  });

  it("a big discount can push an order back under the free-shipping threshold", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 5500, quantity: 1 }],
      discountCents: 1000, // 5500 -> 4500 < 5000
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    expect(r.shippingCents).toBe(599);
  });

  it("skipShipping (pickup/digital) charges nothing", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
      skipShipping: true,
    });
    expect(r.shippingCents).toBe(0);
  });

  it("never charges shipping on a zero-value order", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      discountCents: 1000,
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    expect(r.discountedSubtotalCents).toBe(0);
    expect(r.shippingCents).toBe(0);
  });
});

describe("computeOrderTotals — grand total", () => {
  it("totals = discountedSubtotal + tax + shipping", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 2000, quantity: 1 }],
      discountCents: 500,
      taxRate: 0.0825,
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    const expected = r.discountedSubtotalCents + r.taxCents + r.shippingCents;
    expect(r.totalCents).toBe(expected);
  });

  it("all outputs are non-negative integers", () => {
    const r = computeOrderTotals({
      lines: [{ unitPriceCents: 1234, quantity: 3 }],
      discountCents: 111,
      loyaltyValueCents: 222,
      taxRate: 0.0825,
      flatShippingCents: 599,
      freeShippingThresholdCents: 5000,
    });
    for (const v of Object.values(r)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

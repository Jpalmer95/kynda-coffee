import { describe, it, expect } from "vitest";
import {
  calculatePrice,
  applyRounding,
  isProfitable,
  priceForCategory,
  getPricingProfile,
  DEFAULT_PRICING_PROFILES,
} from "./engine";

describe("applyRounding", () => {
  it("charm_99 rounds up to the next X.99", () => {
    expect(applyRounding(1850, "charm_99")).toBe(1899);
    expect(applyRounding(1900, "charm_99")).toBe(1999); // 19.00 -> next is 19.99
    expect(applyRounding(1, "charm_99")).toBe(99);
  });

  it("charm_49_99 picks the next .49 or .99 above", () => {
    expect(applyRounding(1820, "charm_49_99")).toBe(1849);
    expect(applyRounding(1860, "charm_49_99")).toBe(1899);
    expect(applyRounding(1910, "charm_49_99")).toBe(1949);
  });

  it("nearest_5 and nearest_25 round to step", () => {
    expect(applyRounding(1843, "nearest_5")).toBe(1845);
    expect(applyRounding(1837, "nearest_25")).toBe(1825);
  });

  it("none returns exact rounded cents", () => {
    expect(applyRounding(1843.6, "none")).toBe(1844);
  });

  it("returns 0 for non-positive input", () => {
    expect(applyRounding(0, "charm_99")).toBe(0);
    expect(applyRounding(-5, "charm_99")).toBe(0);
  });
});

describe("calculatePrice — profit guarantee (the money-safety rail)", () => {
  it("hits the target margin for a normal merch item", () => {
    const r = calculatePrice({
      costCents: 1280, // Printful tee cost
      shippingCents: 500,
      targetMarginPct: 0.6,
      paymentFeePct: 0.029,
      paymentFeeFixedCents: 30,
      rounding: "none",
    });
    expect(r.meetsTarget).toBe(true);
    expect(r.profitable).toBe(true);
    expect(r.marginPct).toBeGreaterThanOrEqual(0.595);
    // profit must cover everything
    expect(r.retailCents - r.unitCostCents - r.paymentFeeCents).toBe(r.profitCents);
    expect(r.profitCents).toBeGreaterThan(0);
  });

  it("NEVER returns a price below the cost floor + min profit", () => {
    // Adversarial: tiny cost, max margin target. The engine clamps margin to
    // 0.95, so this stays achievable — but the invariant we care about is that
    // it is always profitable and priced above unit cost.
    const r = calculatePrice({
      costCents: 100,
      shippingCents: 50,
      targetMarginPct: 0.99,
      minProfitCents: 50,
      rounding: "none",
    });
    expect(r.profitable).toBe(true);
    expect(r.profitCents).toBeGreaterThanOrEqual(50);
    expect(r.retailCents).toBeGreaterThan(r.unitCostCents);
  });

  it("falls back to the cost-plus floor when the target margin is mathematically impossible", () => {
    // Force impossibility: a fee fraction so large the margin target can't be met.
    const r = calculatePrice({
      costCents: 800,
      shippingCents: 100,
      targetMarginPct: 0.9,
      paymentFeePct: 0.2, // 0.9 + 0.2 > 1 -> denom <= 0
      minProfitCents: 50,
      rounding: "none",
    });
    expect(r.meetsTarget).toBe(false); // honest: target not achievable
    expect(r.profitable).toBe(true); // but still never at a loss
    expect(r.profitCents).toBeGreaterThanOrEqual(50);
  });

  it("covers payment fees so they never eat the margin", () => {
    const r = calculatePrice({
      costCents: 500,
      targetMarginPct: 0.5,
      paymentFeePct: 0.029,
      paymentFeeFixedCents: 30,
      rounding: "none",
    });
    const recomputedFee = Math.round(r.retailCents * 0.029) + 30;
    expect(r.paymentFeeCents).toBe(recomputedFee);
    // net profit after the fee is still >= ~50% of retail
    expect(r.marginPct).toBeGreaterThanOrEqual(0.495);
  });

  it("is profitable across a wide sweep of costs and margins (property test)", () => {
    for (let cost = 0; cost <= 10000; cost += 137) {
      for (const margin of [0.2, 0.4, 0.55, 0.7, 0.85]) {
        const r = calculatePrice({
          costCents: cost,
          shippingCents: 300,
          targetMarginPct: margin,
          minProfitCents: 50,
          rounding: "charm_99",
        });
        // The invariant that matters: we never sell at a loss.
        expect(r.profitCents).toBeGreaterThanOrEqual(50);
        expect(r.retailCents).toBeGreaterThan(r.unitCostCents);
      }
    }
  });

  it("charm rounding only ever increases price (stays above floor)", () => {
    const exact = calculatePrice({ costCents: 733, targetMarginPct: 0.5, rounding: "none" });
    const charm = calculatePrice({ costCents: 733, targetMarginPct: 0.5, rounding: "charm_99" });
    expect(charm.retailCents).toBeGreaterThanOrEqual(exact.retailCents);
    expect(charm.profitCents).toBeGreaterThanOrEqual(exact.profitCents);
  });

  it("handles zero cost (e.g. free sample with shipping) without dividing by zero", () => {
    const r = calculatePrice({ costCents: 0, shippingCents: 0, targetMarginPct: 0.5, rounding: "none" });
    expect(r.retailCents).toBeGreaterThanOrEqual(1);
    expect(r.profitable).toBe(true);
  });

  it("produces a transparent breakdown", () => {
    const r = calculatePrice({ costCents: 1000, shippingCents: 200, targetMarginPct: 0.6 });
    expect(r.breakdown.length).toBeGreaterThan(3);
    expect(r.breakdown.some((l) => l.includes("Retail price"))).toBe(true);
    expect(r.breakdown.some((l) => l.includes("Net profit"))).toBe(true);
  });
});

describe("isProfitable", () => {
  it("flags a money-losing price", () => {
    expect(isProfitable(1000, 1200, { shippingCents: 100 })).toBe(false);
  });
  it("accepts a healthy price", () => {
    expect(isProfitable(3000, 1000, { shippingCents: 300 })).toBe(true);
  });
});

describe("category profiles", () => {
  it("has profiles for the shop categories", () => {
    expect(DEFAULT_PRICING_PROFILES["design-studio"]).toBeDefined();
    expect(DEFAULT_PRICING_PROFILES["brew-gear"]).toBeDefined();
    expect(DEFAULT_PRICING_PROFILES.wholesale).toBeDefined();
  });

  it("falls back to a sensible default for unknown categories", () => {
    const p = getPricingProfile("totally-unknown");
    expect(p.targetMarginPct).toBeGreaterThan(0);
    expect(p.minProfitCents).toBeGreaterThan(0);
  });

  it("priceForCategory yields a profitable price for every known category", () => {
    for (const category of Object.keys(DEFAULT_PRICING_PROFILES)) {
      const r = priceForCategory(category, 1500);
      expect(r.profitable).toBe(true);
      expect(r.retailCents).toBeGreaterThan(r.unitCostCents);
    }
  });

  it("wholesale margin is thinner than retail (volume play)", () => {
    const wholesale = priceForCategory("wholesale", 1000);
    const retail = priceForCategory("merch-apparel", 1000);
    expect(wholesale.marginPct).toBeLessThan(retail.marginPct);
  });
});

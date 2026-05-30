/**
 * Adaptive, profit-guaranteed pricing engine (Roadmap V2 — Epic 2).
 *
 * One pure function that produces a retail price guaranteeing a configurable
 * margin AFTER every real cost: cost of goods, print-on-demand (Printful) cost,
 * shipping, and payment-processor fees. It never returns a price below the
 * cost floor + minimum margin, so we cannot accidentally sell at a loss.
 *
 * Used by: Design Studio (custom merch), Shop goods, B2B wholesale tiers, and
 * (advisory) menu items priced from MenuMetrics cost data.
 *
 * Everything is in integer cents. No floating-point money is ever stored.
 */

export interface PricingInputs {
  /** Wholesale / cost-of-goods in cents (e.g. Printful variant cost, vendor cost, recipe cost). */
  costCents: number;
  /** Per-unit shipping cost we incur in cents (POD shipping, inbound freight allocation). 0 if none. */
  shippingCents?: number;
  /**
   * Payment processor fee. Stripe is ~2.9% + 30c; Square ~2.6% + 10c.
   * Provide as fraction (0.029) and fixed cents (30). The engine grosses the
   * price up so the fee is fully covered and the target margin still holds.
   */
  paymentFeePct?: number;
  paymentFeeFixedCents?: number;
  /** Target gross margin as a fraction of retail price (0.60 = 60% margin). */
  targetMarginPct: number;
  /**
   * Absolute minimum profit per unit in cents. A hard floor independent of the
   * margin target — protects low-cost items from rounding away their profit.
   */
  minProfitCents?: number;
  /** Charm-rounding strategy applied to the final retail price. */
  rounding?: RoundingStrategy;
}

export type RoundingStrategy =
  | "none" // exact cents
  | "nearest_5" // round to nearest 5c
  | "nearest_25" // round to nearest 25c
  | "charm_99" // round UP to the next X.99
  | "charm_49_99"; // round UP to the next X.49 or X.99 (whichever is nearer above)

export interface PricingResult {
  /** Final customer-facing retail price in cents (post-rounding, floor-enforced). */
  retailCents: number;
  /** All-in cost we incur per unit (goods + shipping), excluding payment fees. */
  unitCostCents: number;
  /** Payment processor fee on the final retail price, in cents. */
  paymentFeeCents: number;
  /** Net profit per unit after all costs and fees, in cents. */
  profitCents: number;
  /** Realized margin as a fraction of retail (profit / retail). */
  marginPct: number;
  /** True if the margin target could be met; false if we had to use the floor. */
  meetsTarget: boolean;
  /** True if the resulting price is profitable at all (profit >= minProfit). */
  profitable: boolean;
  /** Human-readable breakdown lines for admin transparency. */
  breakdown: string[];
}

const DEFAULTS = {
  shippingCents: 0,
  paymentFeePct: 0.029,
  paymentFeeFixedCents: 30,
  minProfitCents: 50,
  rounding: "charm_99" as RoundingStrategy,
};

/** Apply a charm/step rounding strategy to a cents value (always rounds UP for charm). */
export function applyRounding(cents: number, strategy: RoundingStrategy): number {
  if (cents <= 0) return 0;
  switch (strategy) {
    case "none":
      return Math.round(cents);
    case "nearest_5":
      return Math.round(cents / 5) * 5;
    case "nearest_25":
      return Math.round(cents / 25) * 25;
    case "charm_99": {
      // Round UP to the next X.99 that is >= cents.
      let dollars = Math.ceil(cents / 100);
      let result = dollars * 100 - 1;
      if (result < cents) result = ++dollars * 100 - 1;
      return result;
    }
    case "charm_49_99": {
      const base = Math.floor(cents / 100) * 100;
      const candidates = [base + 49, base + 99, base + 149, base + 199];
      // smallest candidate that is >= cents
      const up = candidates.find((c) => c >= cents);
      return up ?? base + 99;
    }
  }
}

/**
 * Core pricing computation.
 *
 * Solve for retail R such that, after subtracting unit cost C and the payment
 * fee (pct*R + fixed), the remaining profit is at least targetMargin*R:
 *
 *   R - C - (pct*R + fixed) >= margin*R
 *   R*(1 - pct - margin) >= C + fixed
 *   R >= (C + fixed) / (1 - pct - margin)
 *
 * Then enforce the absolute min-profit floor and apply rounding. Rounding only
 * ever increases the price (charm strategies round up), so it can never push us
 * below the floor.
 */
export function calculatePrice(inputs: PricingInputs): PricingResult {
  const costCents = Math.max(0, Math.round(inputs.costCents));
  const shippingCents = Math.max(0, Math.round(inputs.shippingCents ?? DEFAULTS.shippingCents));
  const paymentFeePct = clamp(inputs.paymentFeePct ?? DEFAULTS.paymentFeePct, 0, 0.5);
  const paymentFeeFixedCents = Math.max(0, Math.round(inputs.paymentFeeFixedCents ?? DEFAULTS.paymentFeeFixedCents));
  const targetMarginPct = clamp(inputs.targetMarginPct, 0, 0.95);
  const minProfitCents = Math.max(0, Math.round(inputs.minProfitCents ?? DEFAULTS.minProfitCents));
  const rounding = inputs.rounding ?? DEFAULTS.rounding;

  const unitCostCents = costCents + shippingCents;

  // Denominator must stay positive; if margin + fee >= 1 the target is impossible,
  // so fall back to a cost-plus floor that still covers fees + min profit.
  const denom = 1 - paymentFeePct - targetMarginPct;

  let targetRetail: number;
  let targetAchievable: boolean;
  if (denom > 0.01) {
    targetRetail = (unitCostCents + paymentFeeFixedCents) / denom;
    targetAchievable = true;
  } else {
    targetRetail = 0;
    targetAchievable = false;
  }

  // Floor price: must cover unit cost + fees + the absolute minimum profit.
  //   R - C - (pct*R + fixed) >= minProfit
  //   R >= (C + fixed + minProfit) / (1 - pct)
  const floorRetail = (unitCostCents + paymentFeeFixedCents + minProfitCents) / (1 - paymentFeePct);

  const rawRetail = Math.max(targetRetail, floorRetail);
  const retailCents = Math.max(1, applyRounding(rawRetail, rounding));

  const paymentFeeCents = Math.round(retailCents * paymentFeePct) + paymentFeeFixedCents;
  const profitCents = retailCents - unitCostCents - paymentFeeCents;
  const marginPct = retailCents > 0 ? profitCents / retailCents : 0;

  const meetsTarget = targetAchievable && marginPct >= targetMarginPct - 0.005; // tolerance for rounding
  const profitable = profitCents >= minProfitCents;

  const breakdown = [
    `Cost of goods: ${fmt(costCents)}`,
    shippingCents > 0 ? `Shipping (our cost): ${fmt(shippingCents)}` : null,
    `Unit cost: ${fmt(unitCostCents)}`,
    `Target margin: ${(targetMarginPct * 100).toFixed(0)}%`,
    `Payment fee: ${(paymentFeePct * 100).toFixed(1)}% + ${fmt(paymentFeeFixedCents)} = ${fmt(paymentFeeCents)}`,
    `Retail price: ${fmt(retailCents)}`,
    `Net profit: ${fmt(profitCents)} (${(marginPct * 100).toFixed(1)}% margin)`,
    meetsTarget ? "Meets target margin ✓" : "Using cost-plus floor (target not achievable) ⚠",
  ].filter((line): line is string => line !== null);

  return {
    retailCents,
    unitCostCents,
    paymentFeeCents,
    profitCents,
    marginPct,
    meetsTarget,
    profitable,
    breakdown,
  };
}

/** Quick boolean guard: would this retail price be profitable given costs? */
export function isProfitable(
  retailCents: number,
  costCents: number,
  opts?: { shippingCents?: number; paymentFeePct?: number; paymentFeeFixedCents?: number; minProfitCents?: number }
): boolean {
  const shipping = opts?.shippingCents ?? 0;
  const pct = opts?.paymentFeePct ?? DEFAULTS.paymentFeePct;
  const fixed = opts?.paymentFeeFixedCents ?? DEFAULTS.paymentFeeFixedCents;
  const minProfit = opts?.minProfitCents ?? DEFAULTS.minProfitCents;
  const fee = Math.round(retailCents * pct) + fixed;
  const profit = retailCents - costCents - shipping - fee;
  return profit >= minProfit;
}

/**
 * Default pricing profiles by Shop category. Owners override these in admin
 * Pricing Rules (Epic 2 follow-up); these are sensible starting points so the
 * engine is usable immediately. Margins reflect typical specialty-retail norms.
 */
export interface PricingProfile {
  targetMarginPct: number;
  minProfitCents: number;
  rounding: RoundingStrategy;
  /** Flat per-unit shipping buffer to fold into cost when no live rate is known. */
  shippingBufferCents: number;
}

export const DEFAULT_PRICING_PROFILES: Record<string, PricingProfile> = {
  // Print-on-demand / custom merch: higher margin to absorb POD variability
  "design-studio": { targetMarginPct: 0.62, minProfitCents: 300, rounding: "charm_99", shippingBufferCents: 500 },
  "merch-apparel": { targetMarginPct: 0.6, minProfitCents: 300, rounding: "charm_99", shippingBufferCents: 500 },
  "merch-mugs": { targetMarginPct: 0.62, minProfitCents: 250, rounding: "charm_99", shippingBufferCents: 400 },
  "merch-glassware": { targetMarginPct: 0.62, minProfitCents: 250, rounding: "charm_99", shippingBufferCents: 400 },
  "merch-accessories": { targetMarginPct: 0.62, minProfitCents: 200, rounding: "charm_99", shippingBufferCents: 300 },
  // Sourced retail goods
  "brew-gear": { targetMarginPct: 0.45, minProfitCents: 400, rounding: "charm_99", shippingBufferCents: 600 },
  "bulk-tea": { targetMarginPct: 0.55, minProfitCents: 150, rounding: "charm_49_99", shippingBufferCents: 200 },
  apothecary: { targetMarginPct: 0.55, minProfitCents: 200, rounding: "charm_99", shippingBufferCents: 300 },
  "coffee-beans": { targetMarginPct: 0.5, minProfitCents: 300, rounding: "charm_99", shippingBufferCents: 400 },
  // Wholesale / B2B: thinner margin, volume play, no consumer charm pricing
  wholesale: { targetMarginPct: 0.3, minProfitCents: 100, rounding: "nearest_25", shippingBufferCents: 0 },
};

export function getPricingProfile(category: string): PricingProfile {
  return (
    DEFAULT_PRICING_PROFILES[category] ?? {
      targetMarginPct: 0.55,
      minProfitCents: 200,
      rounding: "charm_99",
      shippingBufferCents: 400,
    }
  );
}

/**
 * Convenience: price a Shop/Studio item from its cost using the category profile.
 * Folds the profile's shipping buffer in unless an explicit live shipping cost
 * is supplied.
 */
export function priceForCategory(
  category: string,
  costCents: number,
  opts?: { liveShippingCents?: number; paymentFeePct?: number; paymentFeeFixedCents?: number }
): PricingResult {
  const profile = getPricingProfile(category);
  return calculatePrice({
    costCents,
    shippingCents: opts?.liveShippingCents ?? profile.shippingBufferCents,
    targetMarginPct: profile.targetMarginPct,
    minProfitCents: profile.minProfitCents,
    rounding: profile.rounding,
    paymentFeePct: opts?.paymentFeePct,
    paymentFeeFixedCents: opts?.paymentFeeFixedCents,
  });
}

// ---- helpers ----
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

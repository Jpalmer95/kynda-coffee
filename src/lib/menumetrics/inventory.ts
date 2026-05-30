/**
 * MenuMetrics-driven inventory & cost analysis (Roadmap V2 — Epic 7).
 *
 * Pure, unit-testable logic for the autonomous inventory/costing features:
 * low-stock detection, days-of-cover, vendor price-trend analysis, and the
 * monthly "better-price" finder. MenuMetrics provides the raw cost/stock data;
 * these functions turn it into alerts and owner-facing recommendations.
 *
 * All recommendations are advisory — switching vendors / reordering requires
 * owner action. The agent reports; the owner decides.
 */

export interface StockLevel {
  ingredient_id: string;
  name: string;
  on_hand: number;
  reorder_threshold: number | null;
}

export type StockStatus = "out" | "low" | "ok" | "untracked";

export function stockStatus(level: Pick<StockLevel, "on_hand" | "reorder_threshold">): StockStatus {
  if (level.reorder_threshold == null) return "untracked";
  if (level.on_hand <= 0) return "out";
  if (level.on_hand <= level.reorder_threshold) return "low";
  return "ok";
}

export interface LowStockAlert {
  ingredient_id: string;
  name: string;
  status: Extract<StockStatus, "low" | "out">;
  on_hand: number;
  threshold: number;
  message: string;
}

/** Find ingredients at or below their reorder threshold. */
export function detectLowStock(levels: StockLevel[]): LowStockAlert[] {
  const alerts: LowStockAlert[] = [];
  for (const l of levels) {
    const status = stockStatus(l);
    if (status === "low" || status === "out") {
      alerts.push({
        ingredient_id: l.ingredient_id,
        name: l.name,
        status,
        on_hand: l.on_hand,
        threshold: l.reorder_threshold ?? 0,
        message:
          status === "out"
            ? `${l.name} is OUT of stock — reorder now.`
            : `${l.name} is low (${l.on_hand} on hand, reorder at ${l.reorder_threshold}).`,
      });
    }
  }
  return alerts;
}

/**
 * Days of cover = on_hand / average daily usage. Returns null when usage is
 * unknown/zero. Useful for prioritizing reorders beyond a flat threshold.
 */
export function daysOfCover(onHand: number, avgDailyUsage: number): number | null {
  if (avgDailyUsage <= 0) return null;
  return Math.floor(onHand / avgDailyUsage);
}

export interface VendorPricePoint {
  vendor: string;
  cost_cents: number;
  captured_at: string; // ISO
}

export interface PriceTrend {
  direction: "up" | "down" | "flat";
  changePct: number; // signed, latest vs earliest
  latestCents: number;
  earliestCents: number;
}

/** Trend of a single ingredient's price over a time-ordered series. */
export function priceTrend(points: VendorPricePoint[]): PriceTrend | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );
  const earliest = sorted[0].cost_cents;
  const latest = sorted[sorted.length - 1].cost_cents;
  if (earliest <= 0) return null;
  const changePct = Math.round(((latest - earliest) / earliest) * 1000) / 10;
  const direction = changePct > 1 ? "up" : changePct < -1 ? "down" : "flat";
  return { direction, changePct, latestCents: latest, earliestCents: earliest };
}

export interface BetterPriceFinding {
  ingredient_id: string;
  ingredient_name: string;
  currentVendor: string;
  currentCents: number;
  bestVendor: string;
  bestCents: number;
  savingsCents: number;
  savingsPct: number;
}

export interface VendorQuote {
  ingredient_id: string;
  ingredient_name: string;
  vendor: string;
  cost_cents: number;
  is_current?: boolean;
}

/**
 * The monthly "better-price finder": for each ingredient, compare the current
 * vendor's price against all known vendor quotes and flag a cheaper valid source.
 * Returns only ingredients where a strictly cheaper alternative exists.
 *
 * Advisory only — the owner approves any vendor switch.
 */
export function findBetterPrices(quotes: VendorQuote[]): BetterPriceFinding[] {
  // group by ingredient
  const byIngredient = new Map<string, VendorQuote[]>();
  for (const q of quotes) {
    const arr = byIngredient.get(q.ingredient_id) ?? [];
    arr.push(q);
    byIngredient.set(q.ingredient_id, arr);
  }

  const findings: BetterPriceFinding[] = [];
  for (const [, group] of byIngredient) {
    const current = group.find((q) => q.is_current) ?? group.reduce((hi, q) => (q.cost_cents > hi.cost_cents ? q : hi), group[0]);
    const best = group.reduce((lo, q) => (q.cost_cents < lo.cost_cents ? q : lo), group[0]);
    if (best.vendor !== current.vendor && best.cost_cents < current.cost_cents) {
      const savingsCents = current.cost_cents - best.cost_cents;
      findings.push({
        ingredient_id: current.ingredient_id,
        ingredient_name: current.ingredient_name,
        currentVendor: current.vendor,
        currentCents: current.cost_cents,
        bestVendor: best.vendor,
        bestCents: best.cost_cents,
        savingsCents,
        savingsPct: Math.round((savingsCents / current.cost_cents) * 1000) / 10,
      });
    }
  }
  // biggest savings first
  return findings.sort((a, b) => b.savingsCents - a.savingsCents);
}

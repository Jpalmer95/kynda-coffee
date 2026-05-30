import { describe, it, expect } from "vitest";
import {
  stockStatus,
  detectLowStock,
  daysOfCover,
  priceTrend,
  findBetterPrices,
  type StockLevel,
  type VendorPricePoint,
  type VendorQuote,
} from "./inventory";

describe("stockStatus", () => {
  it("classifies out / low / ok / untracked", () => {
    expect(stockStatus({ on_hand: 0, reorder_threshold: 5 })).toBe("out");
    expect(stockStatus({ on_hand: 3, reorder_threshold: 5 })).toBe("low");
    expect(stockStatus({ on_hand: 10, reorder_threshold: 5 })).toBe("ok");
    expect(stockStatus({ on_hand: 10, reorder_threshold: null })).toBe("untracked");
  });
  it("treats on_hand == threshold as low (reorder trigger)", () => {
    expect(stockStatus({ on_hand: 5, reorder_threshold: 5 })).toBe("low");
  });
});

describe("detectLowStock", () => {
  it("returns alerts only for low/out items", () => {
    const levels: StockLevel[] = [
      { ingredient_id: "a", name: "Oat Milk", on_hand: 2, reorder_threshold: 6 },
      { ingredient_id: "b", name: "Espresso Beans", on_hand: 0, reorder_threshold: 10 },
      { ingredient_id: "c", name: "Cups", on_hand: 500, reorder_threshold: 100 },
      { ingredient_id: "d", name: "Napkins", on_hand: 50, reorder_threshold: null },
    ];
    const alerts = detectLowStock(levels);
    expect(alerts.map((a) => a.ingredient_id).sort()).toEqual(["a", "b"]);
    expect(alerts.find((a) => a.ingredient_id === "b")?.status).toBe("out");
    expect(alerts.find((a) => a.ingredient_id === "a")?.status).toBe("low");
  });
});

describe("daysOfCover", () => {
  it("computes floor(on_hand / usage)", () => {
    expect(daysOfCover(20, 3)).toBe(6);
  });
  it("returns null when usage is unknown", () => {
    expect(daysOfCover(20, 0)).toBeNull();
  });
});

describe("priceTrend", () => {
  const pts = (vals: number[]): VendorPricePoint[] =>
    vals.map((c, i) => ({ vendor: "V", cost_cents: c, captured_at: `2026-0${i + 1}-01T00:00:00Z` }));

  it("detects an upward trend", () => {
    const t = priceTrend(pts([100, 120]));
    expect(t?.direction).toBe("up");
    expect(t?.changePct).toBe(20);
  });
  it("detects a downward trend", () => {
    const t = priceTrend(pts([200, 150]));
    expect(t?.direction).toBe("down");
    expect(t?.changePct).toBe(-25);
  });
  it("flat within ±1%", () => {
    expect(priceTrend(pts([100, 100]))?.direction).toBe("flat");
  });
  it("returns null with fewer than 2 points", () => {
    expect(priceTrend(pts([100]))).toBeNull();
  });
  it("sorts by capture time regardless of input order", () => {
    const unordered: VendorPricePoint[] = [
      { vendor: "V", cost_cents: 150, captured_at: "2026-03-01T00:00:00Z" },
      { vendor: "V", cost_cents: 100, captured_at: "2026-01-01T00:00:00Z" },
    ];
    expect(priceTrend(unordered)?.direction).toBe("up");
  });
});

describe("findBetterPrices", () => {
  it("flags a cheaper vendor and computes savings", () => {
    const quotes: VendorQuote[] = [
      { ingredient_id: "beans", ingredient_name: "Espresso Beans", vendor: "Acme", cost_cents: 1200, is_current: true },
      { ingredient_id: "beans", ingredient_name: "Espresso Beans", vendor: "BeanCo", cost_cents: 1000 },
      { ingredient_id: "beans", ingredient_name: "Espresso Beans", vendor: "Pricey", cost_cents: 1500 },
    ];
    const findings = findBetterPrices(quotes);
    expect(findings).toHaveLength(1);
    expect(findings[0].bestVendor).toBe("BeanCo");
    expect(findings[0].savingsCents).toBe(200);
    expect(findings[0].savingsPct).toBeCloseTo(16.7, 1);
  });

  it("returns nothing when the current vendor is already cheapest", () => {
    const quotes: VendorQuote[] = [
      { ingredient_id: "milk", ingredient_name: "Oat Milk", vendor: "Acme", cost_cents: 400, is_current: true },
      { ingredient_id: "milk", ingredient_name: "Oat Milk", vendor: "Other", cost_cents: 450 },
    ];
    expect(findBetterPrices(quotes)).toEqual([]);
  });

  it("sorts findings by biggest savings first", () => {
    const quotes: VendorQuote[] = [
      { ingredient_id: "a", ingredient_name: "A", vendor: "Cur", cost_cents: 1000, is_current: true },
      { ingredient_id: "a", ingredient_name: "A", vendor: "Alt", cost_cents: 950 },
      { ingredient_id: "b", ingredient_name: "B", vendor: "Cur", cost_cents: 2000, is_current: true },
      { ingredient_id: "b", ingredient_name: "B", vendor: "Alt", cost_cents: 1500 },
    ];
    const findings = findBetterPrices(quotes);
    expect(findings.map((f) => f.ingredient_id)).toEqual(["b", "a"]);
  });
});

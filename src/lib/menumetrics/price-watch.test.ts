import { describe, expect, it } from "vitest";
import {
  computePriceTrends,
  formatPriceWatchSummary,
  type VendorPriceSnapshot,
} from "./price-watch";

const NOW = new Date("2026-06-10T12:00:00Z");

function snap(
  ingredient: string,
  vendor: string,
  costCents: number,
  daysAgo: number
): VendorPriceSnapshot {
  return {
    ingredient_id: ingredient,
    ingredient_name: ingredient,
    vendor,
    pack_size: "1 lb",
    unit: "pounds",
    cost_cents: costCents,
    captured_at: new Date(NOW.getTime() - daysAgo * 864e5).toISOString(),
  };
}

describe("computePriceTrends", () => {
  it("flags a price spike (>=15%)", () => {
    const report = computePriceTrends(
      [snap("beans", "HEB", 1000, 60), snap("beans", "HEB", 1200, 1)],
      90,
      NOW
    );
    expect(report.flagged).toHaveLength(1);
    expect(report.flagged[0].classification).toBe("spike");
    expect(report.flagged[0].change_pct).toBe(20);
  });

  it("flags slow creep (5-15%)", () => {
    const report = computePriceTrends(
      [snap("milk", "HEB", 500, 80), snap("milk", "HEB", 535, 2)],
      90,
      NOW
    );
    expect(report.flagged).toHaveLength(1);
    expect(report.flagged[0].classification).toBe("creep");
    expect(report.flagged[0].change_pct).toBe(7);
  });

  it("treats <5% movement as stable", () => {
    const report = computePriceTrends(
      [snap("cups", "Amazon", 2000, 30), snap("cups", "Amazon", 2040, 1)],
      90,
      NOW
    );
    expect(report.flagged).toHaveLength(0);
    expect(report.stable_count).toBe(1);
  });

  it("reports decreases separately as savings opportunities", () => {
    const report = computePriceTrends(
      [snap("oat milk", "Costco", 600, 45), snap("oat milk", "Costco", 540, 1)],
      90,
      NOW
    );
    expect(report.flagged).toHaveLength(0);
    expect(report.decreases).toHaveLength(1);
    expect(report.decreases[0].change_pct).toBe(-10);
  });

  it("tracks vendors independently for the same ingredient", () => {
    const report = computePriceTrends(
      [
        snap("beans", "HEB", 1000, 60),
        snap("beans", "HEB", 1200, 1),
        snap("beans", "Costco", 900, 60),
        snap("beans", "Costco", 905, 1),
      ],
      90,
      NOW
    );
    expect(report.flagged).toHaveLength(1);
    expect(report.flagged[0].vendor).toBe("HEB");
    expect(report.stable_count).toBe(1);
  });

  it("ignores snapshots outside the window and single-snapshot pairs", () => {
    const report = computePriceTrends(
      [snap("syrup", "HEB", 800, 200), snap("syrup", "HEB", 900, 1)],
      90,
      NOW
    );
    // Only one snapshot inside 90d → no trend.
    expect(report.flagged).toHaveLength(0);
    expect(report.ingredients_analyzed).toBe(1);
  });

  it("ignores zero/negative cost rows", () => {
    const report = computePriceTrends(
      [snap("beans", "HEB", 0, 30), snap("beans", "HEB", 1000, 1)],
      90,
      NOW
    );
    expect(report.flagged).toHaveLength(0);
  });

  it("sorts flagged by biggest increase first", () => {
    const report = computePriceTrends(
      [
        snap("a", "HEB", 100, 60),
        snap("a", "HEB", 110, 1), // +10%
        snap("b", "HEB", 100, 60),
        snap("b", "HEB", 150, 1), // +50%
      ],
      90,
      NOW
    );
    expect(report.flagged[0].ingredient_id).toBe("b");
  });
});

describe("formatPriceWatchSummary", () => {
  it("produces an all-clear line when nothing is flagged", () => {
    const report = computePriceTrends(
      [snap("cups", "Amazon", 2000, 30), snap("cups", "Amazon", 2010, 1)],
      90,
      NOW
    );
    expect(formatPriceWatchSummary(report)).toContain("stable");
  });

  it("lists flagged ingredients with prices and percentages", () => {
    const report = computePriceTrends(
      [snap("beans", "HEB", 1000, 60), snap("beans", "HEB", 1200, 1)],
      90,
      NOW
    );
    const text = formatPriceWatchSummary(report);
    expect(text).toContain("SPIKE");
    expect(text).toContain("beans");
    expect(text).toContain("$10.00 -> $12.00");
    expect(text).toContain("owner approval");
  });
});

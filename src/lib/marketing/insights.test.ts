import { describe, it, expect } from "vitest";
import { generateInsights, type InsightInputs } from "./insights";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();

function dayKey(daysAgo: number): string {
  return new Date(NOW - daysAgo * 86400000).toISOString().split("T")[0];
}

function base(overrides: Partial<InsightInputs> = {}): InsightInputs {
  return {
    revenueByDay: {},
    topProducts: [],
    cafeRevenue30d: 0,
    merchRevenue30d: 0,
    customersByDay: {},
    ordersByStatus: {},
    liveSpecialsCount: 1,
    pendingApprovalCount: 0,
    activeSubscribers: 0,
    lastNewsletterDaysAgo: 1,
    lowStockCount: 0,
    ...overrides,
  };
}

describe("generateInsights — revenue trend", () => {
  it("flags a >=15% WoW revenue drop as a warning", () => {
    const rev: Record<string, number> = {};
    for (let d = 0; d < 7; d++) rev[dayKey(d)] = 5000; // this week 35k
    for (let d = 7; d < 14; d++) rev[dayKey(d)] = 10000; // prior week 70k
    const ins = generateInsights(base({ revenueByDay: rev }), NOW);
    const hit = ins.find((i) => i.id === "revenue-down");
    expect(hit).toBeTruthy();
    expect(hit!.severity).toBe("warning");
  });

  it("celebrates a >=15% WoW revenue gain", () => {
    const rev: Record<string, number> = {};
    for (let d = 0; d < 7; d++) rev[dayKey(d)] = 10000;
    for (let d = 7; d < 14; d++) rev[dayKey(d)] = 5000;
    const ins = generateInsights(base({ revenueByDay: rev }), NOW);
    expect(ins.find((i) => i.id === "revenue-up")?.severity).toBe("positive");
  });

  it("routes a revenue drop to specials when none are live", () => {
    const rev: Record<string, number> = {};
    for (let d = 0; d < 7; d++) rev[dayKey(d)] = 4000;
    for (let d = 7; d < 14; d++) rev[dayKey(d)] = 10000;
    const ins = generateInsights(base({ revenueByDay: rev, liveSpecialsCount: 0 }), NOW);
    expect(ins.find((i) => i.id === "revenue-down")?.href).toBe("/admin/specials");
  });
});

describe("generateInsights — channel & product mix", () => {
  it("surfaces strong merch share as an opportunity", () => {
    const ins = generateInsights(base({ cafeRevenue30d: 7000, merchRevenue30d: 3000 }), NOW);
    expect(ins.find((i) => i.id === "merch-strong")?.severity).toBe("opportunity");
  });

  it("flags top-product concentration >=30%", () => {
    const ins = generateInsights(
      base({ topProducts: [{ name: "Cortado", units: 50, revenue: 30000 }, { name: "Latte", units: 50, revenue: 30000 }] }),
      NOW
    );
    expect(ins.find((i) => i.id === "top-product-concentration")?.title).toContain("Cortado");
  });
});

describe("generateInsights — marketing hygiene", () => {
  it("nudges to approve waiting drafts", () => {
    const ins = generateInsights(base({ pendingApprovalCount: 3 }), NOW);
    expect(ins.find((i) => i.id === "drafts-waiting")?.detail).toContain("queued");
  });

  it("prompts a first newsletter when audience exists but none sent", () => {
    const ins = generateInsights(base({ activeSubscribers: 100, lastNewsletterDaysAgo: null }), NOW);
    expect(ins.find((i) => i.id === "newsletter-never")).toBeTruthy();
  });

  it("prompts a refresh when the last newsletter is stale", () => {
    const ins = generateInsights(base({ activeSubscribers: 100, lastNewsletterDaysAgo: 40 }), NOW);
    expect(ins.find((i) => i.id === "newsletter-stale")).toBeTruthy();
  });

  it("suggests creating a special when none live", () => {
    const ins = generateInsights(base({ liveSpecialsCount: 0 }), NOW);
    expect(ins.find((i) => i.id === "no-special")).toBeTruthy();
  });
});

describe("generateInsights — operations & ordering", () => {
  it("raises a critical for an order backlog", () => {
    const ins = generateInsights(base({ ordersByStatus: { pending: 4, processing: 3 } }), NOW);
    const hit = ins.find((i) => i.id === "orders-backlog");
    expect(hit?.severity).toBe("critical");
  });

  it("escalates low stock to critical at >=5 items", () => {
    const ins = generateInsights(base({ lowStockCount: 6 }), NOW);
    expect(ins.find((i) => i.id === "low-stock")?.severity).toBe("critical");
  });

  it("sorts critical before opportunity before positive", () => {
    const rev: Record<string, number> = {};
    for (let d = 0; d < 7; d++) rev[dayKey(d)] = 10000;
    for (let d = 7; d < 14; d++) rev[dayKey(d)] = 5000; // revenue-up (positive)
    const ins = generateInsights(
      base({ revenueByDay: rev, ordersByStatus: { pending: 10 }, liveSpecialsCount: 0 }),
      NOW
    );
    const sevOrder = ins.map((i) => i.severity);
    const firstCritical = sevOrder.indexOf("critical");
    const firstPositive = sevOrder.indexOf("positive");
    expect(firstCritical).toBeLessThan(firstPositive);
  });

  it("returns an empty list when everything is healthy and quiet", () => {
    const ins = generateInsights(base(), NOW);
    expect(ins).toEqual([]);
  });
});

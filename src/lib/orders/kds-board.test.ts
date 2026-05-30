import { describe, it, expect } from "vitest";
import {
  resolveMode,
  fulfillmentTag,
  orderMatchesBoard,
  filterOrdersForBoard,
  timerTier,
  minutesSince,
  computeKdsStats,
  KDS_BOARDS,
} from "./kds-board";
import type { KdsOrderLike } from "./kds";

function makeOrder(overrides: Partial<KdsOrderLike> = {}): KdsOrderLike {
  return {
    id: "o1",
    order_number: "1001",
    status: "pending",
    source: "qr",
    order_channel: "pickup",
    created_at: new Date().toISOString(),
    total_cents: 500,
    items: [{ product_name: "Latte" }],
    fulfillment_metadata: { mode: "pickup", label: "", customer_name: "Sam" },
    ...overrides,
  };
}

describe("resolveMode", () => {
  it("prefers fulfillment_metadata.mode", () => {
    expect(resolveMode(makeOrder({ fulfillment_metadata: { mode: "parking" } }))).toBe("parking");
  });
  it("falls back to order_channel then default", () => {
    expect(resolveMode(makeOrder({ fulfillment_metadata: null, order_channel: "table" }))).toBe("table");
    expect(resolveMode(makeOrder({ fulfillment_metadata: null, order_channel: null, source: "qr" }))).toBe("pickup");
  });
});

describe("fulfillmentTag", () => {
  it("labels curbside (parking) with the vehicle description as detail", () => {
    const tag = fulfillmentTag(makeOrder({ fulfillment_metadata: { mode: "parking", label: "Red Honda Civic" } }));
    expect(tag.label).toBe("Curbside");
    expect(tag.detail).toBe("Red Honda Civic");
  });
  it("labels table orders with the table number", () => {
    const tag = fulfillmentTag(makeOrder({ fulfillment_metadata: { mode: "table", label: "12" } }));
    expect(tag.label).toBe("Table 12");
    expect(tag.detail).toBe("12");
  });
  it("handles missing metadata gracefully", () => {
    const tag = fulfillmentTag(makeOrder({ fulfillment_metadata: null, order_channel: "delivery" }));
    expect(tag.label).toBe("Delivery");
    expect(tag.detail).toBeUndefined();
  });
});

describe("orderMatchesBoard", () => {
  it("'all' board matches everything", () => {
    expect(orderMatchesBoard(makeOrder({ fulfillment_metadata: { mode: "delivery" } }), "all")).toBe(true);
  });
  it("parking board only matches curbside orders", () => {
    expect(orderMatchesBoard(makeOrder({ fulfillment_metadata: { mode: "parking" } }), "parking")).toBe(true);
    expect(orderMatchesBoard(makeOrder({ fulfillment_metadata: { mode: "pickup" } }), "parking")).toBe(false);
  });
  it("table board matches both table and lobby", () => {
    expect(orderMatchesBoard(makeOrder({ fulfillment_metadata: { mode: "table" } }), "table")).toBe(true);
    expect(orderMatchesBoard(makeOrder({ fulfillment_metadata: { mode: "lobby" } }), "table")).toBe(true);
  });
});

describe("filterOrdersForBoard", () => {
  const orders = [
    makeOrder({ id: "a", order_number: "1001", fulfillment_metadata: { mode: "pickup", customer_name: "Sam" }, items: [{ product_name: "Latte" }] }),
    makeOrder({ id: "b", order_number: "1002", fulfillment_metadata: { mode: "parking", label: "Blue Truck", customer_name: "Pat" }, items: [{ product_name: "Cold Brew" }] }),
    makeOrder({ id: "c", order_number: "1003", fulfillment_metadata: { mode: "table", label: "5", customer_name: "Lee" }, items: [{ product_name: "Croissant" }] }),
  ];

  it("filters to a board", () => {
    expect(filterOrdersForBoard(orders, "parking").map((o) => o.id)).toEqual(["b"]);
  });
  it("searches by order number, customer, vehicle, and item name", () => {
    expect(filterOrdersForBoard(orders, "all", "blue truck").map((o) => o.id)).toEqual(["b"]);
    expect(filterOrdersForBoard(orders, "all", "croissant").map((o) => o.id)).toEqual(["c"]);
    expect(filterOrdersForBoard(orders, "all", "1001").map((o) => o.id)).toEqual(["a"]);
    expect(filterOrdersForBoard(orders, "all", "lee").map((o) => o.id)).toEqual(["c"]);
  });
  it("combines board + search", () => {
    expect(filterOrdersForBoard(orders, "table", "latte")).toEqual([]);
    expect(filterOrdersForBoard(orders, "table", "croissant").map((o) => o.id)).toEqual(["c"]);
  });
});

describe("timerTier", () => {
  it("escalates fresh -> warm -> late", () => {
    expect(timerTier(2)).toBe("fresh");
    expect(timerTier(10)).toBe("warm");
    expect(timerTier(20)).toBe("late");
  });
  it("respects custom thresholds", () => {
    expect(timerTier(5, { warnAt: 3, lateAt: 6 })).toBe("warm");
    expect(timerTier(6, { warnAt: 3, lateAt: 6 })).toBe("late");
  });
});

describe("minutesSince", () => {
  it("computes elapsed minutes", () => {
    const now = Date.now();
    const tenAgo = new Date(now - 10 * 60000).toISOString();
    expect(minutesSince(tenAgo, now)).toBe(10);
  });
  it("returns 0 for invalid date", () => {
    expect(minutesSince("not-a-date")).toBe(0);
  });
});

describe("computeKdsStats", () => {
  it("returns zeros for empty input", () => {
    const s = computeKdsStats([]);
    expect(s.total).toBe(0);
    expect(s.avgWaitMinutes).toBe(0);
  });
  it("aggregates tiers, averages, longest wait, and mode counts", () => {
    const now = Date.now();
    const orders = [
      makeOrder({ created_at: new Date(now - 2 * 60000).toISOString(), fulfillment_metadata: { mode: "pickup" } }),
      makeOrder({ created_at: new Date(now - 10 * 60000).toISOString(), fulfillment_metadata: { mode: "parking" } }),
      makeOrder({ created_at: new Date(now - 20 * 60000).toISOString(), fulfillment_metadata: { mode: "parking" } }),
    ];
    const s = computeKdsStats(orders, now);
    expect(s.total).toBe(3);
    expect(s.fresh).toBe(1);
    expect(s.warm).toBe(1);
    expect(s.late).toBe(1);
    expect(s.longestWaitMinutes).toBe(20);
    expect(s.avgWaitMinutes).toBe(Math.round((2 + 10 + 20) / 3));
    expect(s.byMode.parking).toBe(2);
    expect(s.byMode.pickup).toBe(1);
  });
});

describe("KDS_BOARDS", () => {
  it("includes an 'all' board and the key fulfillment boards", () => {
    const keys = KDS_BOARDS.map((b) => b.key);
    expect(keys).toContain("all");
    expect(keys).toContain("parking");
    expect(keys).toContain("table");
    expect(keys).toContain("delivery");
  });
});

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
  formatModifier,
  formatModifiers,
  normalizeKdsItems,
  sourceBadge,
  deliveryPlatformBadge,
  paymentChip,
  placedAtLabel,
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

describe("formatModifier / formatModifiers — the '[object Object]' fix", () => {
  it("renders object-shaped modifiers (QR/agent orders) by name", () => {
    expect(
      formatModifier({ name: "Oat milk", price_cents: 100, provider_modifier_id: "X" } as never)
    ).toBe("Oat milk");
  });
  it("renders plain-string modifiers (legacy shape)", () => {
    expect(formatModifier("Extra shot")).toBe("Extra shot");
  });
  it("drops null/empty/unknown shapes instead of stringifying them", () => {
    expect(formatModifier(null)).toBeNull();
    expect(formatModifier("")).toBeNull();
    expect(formatModifier({} as never)).toBeNull();
    expect(formatModifier({ name: 42 } as never)).toBeNull();
  });
  it("normalizes a mixed array and never yields '[object Object]'", () => {
    const out = formatModifiers([
      { name: "Iced", price_cents: 0 },
      "Half-sweet",
      null,
      {},
      { name: "House Made Vanilla Syrup", price_cents: 125 },
    ]);
    expect(out).toEqual(["Iced", "Half-sweet", "House Made Vanilla Syrup"]);
    expect(out.join(" ")).not.toContain("object");
  });
  it("handles non-array input", () => {
    expect(formatModifiers(undefined)).toEqual([]);
    expect(formatModifiers("nope")).toEqual([]);
  });
});

describe("normalizeKdsItems", () => {
  it("normalizes the real QR/agent order item shape", () => {
    const items = normalizeKdsItems([
      {
        product_name: "Latte",
        variant_name: "Large",
        quantity: 3,
        modifiers: [
          { name: "Iced", price_cents: 0 },
          { name: "Oat milk", price_cents: 100 },
        ],
      },
    ]);
    expect(items).toEqual([
      { name: "Latte", variant: "Large", quantity: 3, modifiers: ["Iced", "Oat milk"], notes: undefined },
    ]);
  });
  it("hides the noise 'Regular' default variant", () => {
    expect(normalizeKdsItems([{ product_name: "Mocha", variant_name: "Regular", quantity: 1 }])[0].variant).toBeUndefined();
  });
  it("falls back across name/qty field aliases and bad data", () => {
    const items = normalizeKdsItems([
      { name: "POS Item", qty: 2 },
      { product_name: "  ", name: "", quantity: -1 },
      null,
    ]);
    expect(items[0]).toMatchObject({ name: "POS Item", quantity: 2 });
    expect(items[1]).toMatchObject({ name: "Item", quantity: 1 });
    expect(items[2]).toMatchObject({ name: "Item", quantity: 1 });
  });
  it("returns [] for non-array items", () => {
    expect(normalizeKdsItems(null)).toEqual([]);
  });
});

describe("sourceBadge", () => {
  it("labels agent, POS, QR, and online orders", () => {
    expect(sourceBadge(makeOrder({ source: "agent", order_channel: "agent" })).label).toBe("AGENT");
    expect(sourceBadge(makeOrder({ source: "square-pos", order_channel: "pos" })).label).toBe("POS");
    expect(sourceBadge(makeOrder({ source: "qr" })).label).toBe("QR");
    expect(sourceBadge(makeOrder({ source: "website", order_channel: "web" })).label).toBe("ONLINE");
  });
  it("badges third-party delivery platforms above the POS source", () => {
    const dd = makeOrder({
      source: "square-pos",
      order_channel: "delivery",
      fulfillment_metadata: { mode: "delivery", external_source: "DoorDash" },
    });
    expect(sourceBadge(dd).label).toBe("DOORDASH");
    const ue = makeOrder({
      source: "square-pos",
      order_channel: "delivery",
      fulfillment_metadata: { mode: "delivery", external_source: "Uber Eats" },
    });
    expect(sourceBadge(ue).label).toBe("UBER EATS");
    const gh = makeOrder({
      source: "square-pos",
      order_channel: "delivery",
      fulfillment_metadata: { mode: "delivery", external_source: "Grubhub" },
    });
    expect(sourceBadge(gh).label).toBe("GRUBHUB");
  });
  it("shows unknown marketplaces by name so staff know it's third-party", () => {
    const other = makeOrder({
      source: "square-pos",
      order_channel: "delivery",
      fulfillment_metadata: { mode: "delivery", external_source: "ChowNow" },
    });
    expect(sourceBadge(other).label).toBe("CHOWNOW");
  });
  it("returns null delivery badge when external_source is absent", () => {
    expect(deliveryPlatformBadge(makeOrder())).toBeNull();
  });
});

describe("paymentChip", () => {
  it("shows PAID for settled online orders", () => {
    const chip = paymentChip({ ...makeOrder(), payment_status: "paid" });
    expect(chip?.label).toBe("PAID");
    expect(chip?.collect).toBe(false);
  });
  it("flags unpaid pay-at-counter orders so staff collect at handoff", () => {
    const chip = paymentChip({ ...makeOrder(), payment_status: "unpaid" });
    expect(chip?.label).toBe("PAY AT REGISTER");
    expect(chip?.collect).toBe(true);
  });
  it("hides the chip for Square POS orders (settled in Square)", () => {
    expect(paymentChip({ ...makeOrder({ source: "square-pos", order_channel: "pos" }), payment_status: "unpaid" })).toBeNull();
  });
});

describe("placedAtLabel", () => {
  it("formats a time and tolerates garbage", () => {
    expect(placedAtLabel(new Date().toISOString())).toMatch(/\d/);
    expect(placedAtLabel("not-a-date")).toBe("");
  });
});

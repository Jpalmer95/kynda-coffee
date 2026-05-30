import { describe, it, expect } from "vitest";
import {
  isSpecialLive,
  activeSpecials,
  discountPct,
  marketingSeedForSpecial,
  type Special,
} from "./specials";

function makeSpecial(overrides: Partial<Special> = {}): Special {
  return {
    id: "s1",
    title: "Maple Oat Latte",
    subtitle: "Fall favorite",
    description: "Espresso, steamed oat milk, real maple.",
    provider_item_id: "SQ_ITEM_1",
    provider_variation_id: null,
    image_url: "https://example.com/latte.jpg",
    price_cents: 575,
    compare_at_cents: 650,
    badge: "Seasonal",
    cta_label: "Order now",
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 0,
    ...overrides,
  };
}

describe("isSpecialLive", () => {
  const now = Date.parse("2026-06-15T12:00:00Z");

  it("is live when active and no window set", () => {
    expect(isSpecialLive(makeSpecial(), now)).toBe(true);
  });
  it("is not live when inactive", () => {
    expect(isSpecialLive(makeSpecial({ is_active: false }), now)).toBe(false);
  });
  it("is not live before its start", () => {
    expect(isSpecialLive(makeSpecial({ starts_at: "2026-07-01T00:00:00Z" }), now)).toBe(false);
  });
  it("is not live after its end", () => {
    expect(isSpecialLive(makeSpecial({ ends_at: "2026-06-01T00:00:00Z" }), now)).toBe(false);
  });
  it("is live inside its window", () => {
    expect(
      isSpecialLive(makeSpecial({ starts_at: "2026-06-01T00:00:00Z", ends_at: "2026-06-30T23:59:59Z" }), now)
    ).toBe(true);
  });
  it("ignores invalid dates gracefully", () => {
    expect(isSpecialLive(makeSpecial({ starts_at: "not-a-date" }), now)).toBe(true);
  });
});

describe("activeSpecials", () => {
  const now = Date.parse("2026-06-15T12:00:00Z");

  it("filters out inactive/out-of-window and sorts by sort_order then title", () => {
    const specials = [
      makeSpecial({ id: "a", title: "Zebra", sort_order: 2 }),
      makeSpecial({ id: "b", title: "Apple", sort_order: 1 }),
      makeSpecial({ id: "c", title: "Banana", sort_order: 1 }),
      makeSpecial({ id: "d", is_active: false }),
      makeSpecial({ id: "e", ends_at: "2026-01-01T00:00:00Z" }),
    ];
    const result = activeSpecials(specials, now).map((s) => s.id);
    expect(result).toEqual(["b", "c", "a"]); // sort_order 1 (Apple, Banana), then 2 (Zebra)
  });

  it("returns empty when nothing is live", () => {
    expect(activeSpecials([makeSpecial({ is_active: false })], now)).toEqual([]);
  });
});

describe("discountPct", () => {
  it("computes percentage off when compare-at is higher", () => {
    expect(discountPct({ price_cents: 575, compare_at_cents: 650 })).toBe(12);
  });
  it("returns null when no valid discount", () => {
    expect(discountPct({ price_cents: 650, compare_at_cents: 650 })).toBeNull();
    expect(discountPct({ price_cents: 700, compare_at_cents: 650 })).toBeNull();
    expect(discountPct({ price_cents: null, compare_at_cents: 650 })).toBeNull();
  });
});

describe("marketingSeedForSpecial", () => {
  it("builds a structured marketing brief from a special", () => {
    const seed = marketingSeedForSpecial(makeSpecial());
    expect(seed.headline).toBe("Maple Oat Latte");
    expect(seed.body).toContain("Fall favorite");
    expect(seed.body).toContain("maple");
    expect(seed.callToAction).toBe("Order now");
    expect(seed.discountPct).toBe(12);
    expect(seed.badge).toBe("Seasonal");
  });

  it("falls back to title when no subtitle/description", () => {
    const seed = marketingSeedForSpecial(makeSpecial({ subtitle: null, description: null }));
    expect(seed.body).toBe("Maple Oat Latte");
  });
});

import { describe, it, expect } from "vitest";
import { planMarketingLoop, type RecentPostRef } from "./loop";
import type { Special } from "./specials";

const NOW = new Date("2026-06-01T12:00:00Z").getTime();

function mk(overrides: Partial<Special> = {}): Special {
  return {
    id: "s1",
    title: "Maple Oat Latte",
    subtitle: "Fall favorite",
    description: "Espresso, oat milk, real maple.",
    provider_item_id: null,
    provider_variation_id: null,
    image_url: "https://cdn/img.jpg",
    price_cents: 600,
    compare_at_cents: null,
    badge: null,
    cta_label: "Order now",
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 0,
    marketing_generated: false,
    ...overrides,
  };
}

describe("planMarketingLoop", () => {
  it("includes a live, un-marketed special as a feature", () => {
    const plan = planMarketingLoop([mk()], [], {}, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].angle).toBe("feature");
    expect(plan[0].platforms.length).toBe(5);
  });

  it("classifies a live discounted special as a deal and ranks it first", () => {
    const feature = mk({ id: "feat" });
    const deal = mk({ id: "deal", price_cents: 500, compare_at_cents: 800 });
    const plan = planMarketingLoop([feature, deal], [], {}, NOW);
    expect(plan[0].specialId).toBe("deal");
    expect(plan[0].angle).toBe("deal");
    expect(plan[0].notes).toContain("%");
  });

  it("classifies an upcoming special as a teaser", () => {
    const soon = mk({ id: "soon", starts_at: new Date(NOW + 3 * 86400000).toISOString() });
    const plan = planMarketingLoop([soon], [], {}, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].angle).toBe("teaser");
    expect(plan[0].notes.toLowerCase()).toContain("coming");
  });

  it("skips specials starting beyond the lookahead window", () => {
    const far = mk({ id: "far", starts_at: new Date(NOW + 30 * 86400000).toISOString() });
    expect(planMarketingLoop([far], [], { lookaheadDays: 7 }, NOW)).toHaveLength(0);
  });

  it("skips a special posted within the cooldown", () => {
    const recent: RecentPostRef[] = [{ special_id: "s1", created_at: new Date(NOW - 2 * 86400000).toISOString() }];
    expect(planMarketingLoop([mk()], recent, { cooldownDays: 10 }, NOW)).toHaveLength(0);
  });

  it("allows re-marketing after the cooldown passes", () => {
    const recent: RecentPostRef[] = [{ special_id: "s1", created_at: new Date(NOW - 20 * 86400000).toISOString() }];
    expect(planMarketingLoop([mk()], recent, { cooldownDays: 10 }, NOW)).toHaveLength(1);
  });

  it("skips already-marketed live specials (no fresh window)", () => {
    expect(planMarketingLoop([mk({ marketing_generated: true })], [], {}, NOW)).toHaveLength(0);
  });

  it("still teases an already-marketed special if it is newly upcoming", () => {
    const s = mk({ marketing_generated: true, starts_at: new Date(NOW + 2 * 86400000).toISOString() });
    const plan = planMarketingLoop([s], [], {}, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].angle).toBe("teaser");
  });

  it("ignores inactive specials", () => {
    expect(planMarketingLoop([mk({ is_active: false })], [], {}, NOW)).toHaveLength(0);
  });

  it("caps the plan at maxCampaigns", () => {
    const many = Array.from({ length: 6 }, (_, i) => mk({ id: `s${i}`, title: `S${i}` }));
    expect(planMarketingLoop(many, [], { maxCampaigns: 3 }, NOW)).toHaveLength(3);
  });

  it("respects a custom platform set", () => {
    const plan = planMarketingLoop([mk()], [], { platforms: ["instagram"] }, NOW);
    expect(plan[0].platforms).toEqual(["instagram"]);
  });
});

import { describe, it, expect } from "vitest";
import { scoreLead, isScoutWorthy, canTransition, B2B_TRANSITIONS, type B2BLeadInput } from "./leads";

function lead(overrides: Partial<B2BLeadInput> = {}): B2BLeadInput {
  return {
    company: "Test Co",
    lead_type: "other",
    source: "scout",
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("scores grocery higher than a one-off event (strategic fit)", () => {
    const grocery = scoreLead(lead({ lead_type: "grocery" })).score;
    const event = scoreLead(lead({ lead_type: "event" })).score;
    expect(grocery).toBeGreaterThan(event);
  });

  it("rewards estimated recurring value", () => {
    const low = scoreLead(lead({ lead_type: "cafe", est_monthly_value_cents: 20000 })).score;
    const high = scoreLead(lead({ lead_type: "cafe", est_monthly_value_cents: 200000 })).score;
    expect(high).toBeGreaterThan(low);
  });

  it("boosts local Hill Country leads", () => {
    const local = scoreLead(lead({ lead_type: "office", location: "Horseshoe Bay, TX" })).score;
    const remote = scoreLead(lead({ lead_type: "office", location: "Seattle, WA" })).score;
    expect(local).toBeGreaterThan(remote);
  });

  it("boosts inbound interest over cold scout finds", () => {
    const inbound = scoreLead(lead({ lead_type: "cafe", source: "inbound" })).score;
    const scout = scoreLead(lead({ lead_type: "cafe", source: "scout" })).score;
    expect(inbound).toBeGreaterThan(scout);
  });

  it("rewards contactability (email/phone/website)", () => {
    const bare = scoreLead(lead({ lead_type: "cafe" })).score;
    const reachable = scoreLead(lead({ lead_type: "cafe", email: "a@b.com", phone: "555", website: "x.com" })).score;
    expect(reachable).toBeGreaterThan(bare);
  });

  it("clamps to 0-100 and returns explainable factors", () => {
    const r = scoreLead(
      lead({ lead_type: "grocery", source: "inbound", location: "Marble Falls TX", email: "a@b.com", phone: "5", website: "w", est_monthly_value_cents: 500000 })
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.factors.length).toBeGreaterThan(3);
  });
});

describe("isScoutWorthy", () => {
  it("filters out low-fit noise", () => {
    expect(isScoutWorthy(lead({ lead_type: "other", source: "scout" }))).toBe(false);
  });
  it("surfaces strong fits", () => {
    expect(isScoutWorthy(lead({ lead_type: "grocery", source: "scout", location: "Burnet TX", est_monthly_value_cents: 150000, email: "buyer@store.com" }))).toBe(true);
  });
});

describe("canTransition", () => {
  it("allows the happy path new -> approved -> contacted -> negotiating -> won", () => {
    expect(canTransition("new", "approved")).toBe(true);
    expect(canTransition("approved", "contacted")).toBe(true);
    expect(canTransition("contacted", "negotiating")).toBe(true);
    expect(canTransition("negotiating", "won")).toBe(true);
  });
  it("forbids skipping straight from new to won", () => {
    expect(canTransition("new", "won")).toBe(false);
  });
  it("treats won/lost/rejected as terminal", () => {
    expect(B2B_TRANSITIONS.won).toEqual([]);
    expect(B2B_TRANSITIONS.lost).toEqual([]);
    expect(B2B_TRANSITIONS.rejected).toEqual([]);
  });
});

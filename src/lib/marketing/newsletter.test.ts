import { describe, it, expect } from "vitest";
import {
  newsletterSubject,
  buildNewsletter,
  personalizeUnsubscribe,
} from "./newsletter";
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
    badge: "Seasonal",
    cta_label: "Order now",
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 0,
    marketing_generated: false,
    ...overrides,
  };
}

describe("newsletterSubject", () => {
  it("defaults sensibly with no live specials", () => {
    const { subject, preheader } = newsletterSubject([], NOW);
    expect(subject).toContain("Kynda Coffee");
    expect(subject).toContain("June");
    expect(preheader.length).toBeGreaterThan(0);
  });

  it("headlines the first live special", () => {
    const { subject } = newsletterSubject([mk()], NOW);
    expect(subject).toContain("Maple Oat Latte");
  });

  it("mentions the discount when one applies", () => {
    const { subject } = newsletterSubject([mk({ price_cents: 500, compare_at_cents: 1000 })], NOW);
    expect(subject).toContain("50%");
  });

  it("counts the other specials in the preheader", () => {
    const { preheader } = newsletterSubject([mk({ id: "a" }), mk({ id: "b" }), mk({ id: "c" })], NOW);
    expect(preheader).toMatch(/2 more/);
  });
});

describe("buildNewsletter", () => {
  it("produces subject, preheader, and HTML body", () => {
    const out = buildNewsletter([mk()], { nowMs: NOW });
    expect(out.subject).toContain("Maple Oat Latte");
    expect(out.bodyHtml).toContain("<!doctype html>");
    expect(out.bodyHtml).toContain("Maple Oat Latte");
  });

  it("always includes the unsubscribe placeholder and address", () => {
    const out = buildNewsletter([mk()], { nowMs: NOW });
    expect(out.bodyHtml).toContain("{{UNSUBSCRIBE_URL}}");
    expect(out.bodyHtml).toContain("Horseshoe Bay");
  });

  it("renders a strike-through compare-at price", () => {
    const out = buildNewsletter([mk({ price_cents: 500, compare_at_cents: 800 })], { nowMs: NOW });
    expect(out.bodyHtml).toContain("line-through");
    expect(out.bodyHtml).toContain("$5.00");
    expect(out.bodyHtml).toContain("$8.00");
  });

  it("escapes HTML in special fields (no injection)", () => {
    const out = buildNewsletter([mk({ title: "<script>alert(1)</script>" })], { nowMs: NOW });
    expect(out.bodyHtml).not.toContain("<script>alert(1)</script>");
    expect(out.bodyHtml).toContain("&lt;script&gt;");
  });

  it("still renders a friendly body with zero live specials", () => {
    const out = buildNewsletter([], { nowMs: NOW });
    expect(out.bodyHtml).toContain("<!doctype html>");
    expect(out.bodyHtml).toContain("{{UNSUBSCRIBE_URL}}");
  });

  it("honors a custom intro", () => {
    const out = buildNewsletter([mk()], { nowMs: NOW, intro: "Big news this week!" });
    expect(out.bodyHtml).toContain("Big news this week!");
  });
});

describe("personalizeUnsubscribe", () => {
  it("replaces every placeholder occurrence", () => {
    const body = "a {{UNSUBSCRIBE_URL}} b {{UNSUBSCRIBE_URL}} c";
    const out = personalizeUnsubscribe(body, "https://kyndacoffee.com/unsubscribe?t=abc");
    expect(out).not.toContain("{{UNSUBSCRIBE_URL}}");
    expect(out.match(/abc/g)?.length).toBe(2);
  });
});

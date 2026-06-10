import { describe, it, expect } from "vitest";
import {
  DESIGN_RECOMMENDATIONS,
  getRecommendation,
  buildGenerationPrompt,
  recommendThemes,
} from "./recommendations";

describe("DESIGN_RECOMMENDATIONS", () => {
  it("includes Kynda-brand, local, trending, and genre packs", () => {
    const themes = DESIGN_RECOMMENDATIONS.map((r) => r.theme);
    expect(themes).toContain("kynda-brand");
    expect(themes).toContain("local");
    expect(themes).toContain("trending");
    expect(themes).toContain("funny");
    expect(themes).toContain("cool");
    expect(themes).toContain("sporty");
  });
  it("every pack has seed prompts", () => {
    for (const rec of DESIGN_RECOMMENDATIONS) {
      expect(rec.prompts.length).toBeGreaterThan(0);
    }
  });
});

describe("getRecommendation", () => {
  it("finds a pack by theme", () => {
    expect(getRecommendation("local")?.label).toBe("Local Hill Country");
  });
  it("returns undefined for unknown theme", () => {
    // @ts-expect-error testing unknown
    expect(getRecommendation("nope")).toBeUndefined();
  });
});

describe("buildGenerationPrompt", () => {
  it("always appends print-quality suffix", () => {
    const p = buildGenerationPrompt({ idea: "a coffee cup" });
    expect(p).toContain("a coffee cup");
    expect(p.toLowerCase()).toContain("print-ready");
  });

  it("injects Kynda brand context when brandAware", () => {
    const p = buildGenerationPrompt({ idea: "logo", brandAware: true });
    expect(p).toContain("Kynda Coffee");
    expect(p).toContain("Horseshoe Bay");
  });

  it("omits brand context when not brandAware", () => {
    const p = buildGenerationPrompt({ idea: "logo" });
    expect(p).not.toContain("Horseshoe Bay");
  });

  it("adds genre styling for non-brand themes", () => {
    const p = buildGenerationPrompt({ idea: "cup", theme: "sporty" });
    expect(p.toLowerCase()).toContain("sporty");
  });

  it("includes a freeform style when provided", () => {
    const p = buildGenerationPrompt({ idea: "cup", style: "watercolor" });
    expect(p).toContain("watercolor");
  });

  it("de-dupes repeated parts", () => {
    const p = buildGenerationPrompt({ idea: "watercolor", style: "watercolor" });
    const count = p.split("watercolor").length - 1;
    expect(count).toBe(1);
  });
});

describe("recommendThemes", () => {
  it("leads with kynda-brand for brand fans", () => {
    expect(recommendThemes({ brandFan: true })[0]).toBe("kynda-brand");
  });
  it("always includes trending + local", () => {
    const t = recommendThemes();
    expect(t).toContain("trending");
    expect(t).toContain("local");
  });
  it("adds vintage in fall/winter", () => {
    expect(recommendThemes({ season: "Fall" })).toContain("vintage");
  });
  it("caps at 8 unique themes (memes + seasonal added 2026-06-10)", () => {
    const t = recommendThemes({ brandFan: true, season: "winter" });
    expect(t.length).toBeLessThanOrEqual(8);
    expect(new Set(t).size).toBe(t.length);
  });
});

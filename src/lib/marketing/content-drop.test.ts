import { describe, it, expect } from "vitest";
import {
  buildHashtags,
  fallbackCaption,
  composePostText,
  buildDraftsFromDrop,
  PLATFORM_COPY_RULES,
  BRAND_HASHTAGS,
  type ContentDropInput,
  type DropPlatform,
} from "./content-drop";

describe("buildHashtags", () => {
  it("always appends brand hashtags", () => {
    const tags = buildHashtags([]);
    for (const b of BRAND_HASHTAGS) expect(tags).toContain(b);
  });

  it("dedupes case-insensitively and strips non-alphanumerics", () => {
    const tags = buildHashtags(["kyndacoffee", "Cold Brew!", "#ColdBrew"]);
    const lower = tags.map((t) => t.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length); // no dupes
    expect(tags).toContain("ColdBrew");
    // 'kyndacoffee' seed collapses with brand 'KyndaCoffee'
    expect(lower.filter((t) => t === "kyndacoffee").length).toBe(1);
  });

  it("caps to maxHashtags", () => {
    const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
    expect(buildHashtags(many, 3).length).toBe(3);
  });
});

describe("fallbackCaption", () => {
  it("keeps twitter terse and single-line-ish", () => {
    const text = fallbackCaption({
      platform: "twitter",
      rules: PLATFORM_COPY_RULES.twitter,
      input: { imageUrl: "x", title: "Cortado", notes: "new ratio" },
    });
    expect(text).toContain("Cortado");
    expect(text.length).toBeLessThanOrEqual(280);
  });

  it("uses a richer multi-line voice for instagram", () => {
    const text = fallbackCaption({
      platform: "instagram",
      rules: PLATFORM_COPY_RULES.instagram,
      input: { imageUrl: "x", title: "Lavender Latte" },
    });
    expect(text).toContain("Lavender Latte");
    expect(text).toContain("Horseshoe Bay");
  });

  it("has a sensible default when no title", () => {
    const text = fallbackCaption({
      platform: "facebook",
      rules: PLATFORM_COPY_RULES.facebook,
      input: { imageUrl: "x" },
    });
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("composePostText", () => {
  it("appends hashtags below the caption", () => {
    const out = composePostText("Hello bar", ["KyndaCoffee"], 2000);
    expect(out).toBe("Hello bar\n\n#KyndaCoffee");
  });

  it("drops hashtags when caption+tags exceed the cap but caption fits", () => {
    const caption = "a".repeat(270);
    const out = composePostText(caption, ["KyndaCoffee", "SpecialtyCoffee"], 280);
    expect(out).toBe(caption);
    expect(out.length).toBeLessThanOrEqual(280);
  });

  it("hard-trims with an ellipsis when even the caption is too long", () => {
    const caption = "b".repeat(400);
    const out = composePostText(caption, [], 280);
    expect(out.length).toBeLessThanOrEqual(280);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildDraftsFromDrop", () => {
  const base: ContentDropInput = {
    imageUrl: "https://cdn.kynda/feature.jpg",
    title: "Maple Oat Latte",
    notes: "Fall seasonal, real Vermont maple.",
  };

  it("defaults to all four platforms, all pending_approval + content_drop", async () => {
    const drafts = await buildDraftsFromDrop(base);
    expect(drafts.length).toBe(4);
    for (const d of drafts) {
      expect(d.status).toBe("pending_approval");
      expect(d.source).toBe("content_drop");
      expect(d.image_urls).toEqual([base.imageUrl]);
      expect(PLATFORM_COPY_RULES[d.platform]).toBeTruthy();
      expect(d.text.length).toBeLessThanOrEqual(PLATFORM_COPY_RULES[d.platform].maxChars);
    }
  });

  it("respects an explicit platform subset", async () => {
    const platforms: DropPlatform[] = ["instagram", "twitter"];
    const drafts = await buildDraftsFromDrop({ ...base, platforms });
    expect(drafts.map((d) => d.platform).sort()).toEqual(["instagram", "twitter"]);
  });

  it("threads specialId through to special_id", async () => {
    const drafts = await buildDraftsFromDrop({ ...base, specialId: "spec-123" });
    for (const d of drafts) expect(d.special_id).toBe("spec-123");
  });

  it("uses the AI captionFn when provided", async () => {
    const drafts = await buildDraftsFromDrop(base, async ({ platform }) => `AI:${platform}`);
    const ig = drafts.find((d) => d.platform === "instagram")!;
    expect(ig.text.startsWith("AI:instagram")).toBe(true);
  });

  it("falls back to the template when the captionFn throws", async () => {
    const drafts = await buildDraftsFromDrop(base, async () => {
      throw new Error("openai down");
    });
    const ig = drafts.find((d) => d.platform === "instagram")!;
    expect(ig.text).toContain("Maple Oat Latte");
  });

  it("falls back when captionFn returns empty", async () => {
    const drafts = await buildDraftsFromDrop(base, async () => "   ");
    const fb = drafts.find((d) => d.platform === "facebook")!;
    expect(fb.text.length).toBeGreaterThan(0);
  });

  it("throws on a missing imageUrl", async () => {
    await expect(buildDraftsFromDrop({ imageUrl: "" })).rejects.toThrow();
  });
});

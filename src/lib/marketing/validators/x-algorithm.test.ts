import { describe, it, expect } from "vitest";
import {
  validateXPost,
  validateGenericPost,
  PLATFORM_LIMITS,
} from "./x-algorithm";

describe("validateXPost", () => {
  it("flags posts exceeding 280 chars as critical", () => {
    const long = "a".repeat(300);
    const result = validateXPost({ text: long });
    expect(result.issues.some((i) => i.rule === "char-limit" && i.severity === "critical")).toBe(true);
    expect(result.score).toBeLessThan(20);
  });

  it("rewards optimal length (120-250 chars)", () => {
    const text = "Just pulled a fresh shot of our Hill Country Dark roast — bold, smoky, and perfect for a Texas morning. Come grab one before the pot's gone. ☕";
    const result = validateXPost({ text, hasImage: true });
    expect(result.strengths.some((s) => s.includes("Optimal length"))).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(55);
  });

  it("penalizes external links", () => {
    const text = "Check out our new menu at https://kyndacoffee.com/menu — fresh items just dropped!";
    const result = validateXPost({ text, hasImage: true });
    expect(result.issues.some((i) => i.rule === "external-link")).toBe(true);
    expect(result.estimatedReachMultiplier).toBeLessThan(1.0);
  });

  it("does not penalize x.com internal links", () => {
    const text = "Following up on our post at https://x.com/kyndacoffee/status/123 — fresh batch just roasted!";
    const result = validateXPost({ text, hasImage: true });
    expect(result.hasExternalLink).toBe(false);
  });

  it("rewards video attachments", () => {
    const text = "Behind the scenes: pulling the perfect espresso shot this morning.";
    const result = validateXPost({ text, hasVideo: true });
    expect(result.strengths.some((s) => s.includes("Video"))).toBe(true);
    expect(result.estimatedReachMultiplier).toBeGreaterThan(1.4);
  });

  it("rewards image attachments", () => {
    const text = "Fresh pour this morning at the shop.";
    const result = validateXPost({ text, hasImage: true });
    expect(result.strengths.some((s) => s.includes("Image"))).toBe(true);
    expect(result.estimatedReachMultiplier).toBeGreaterThan(1.1);
  });

  it("warns on more than 3 hashtags", () => {
    const text = "Fresh roast #coffee #morning #texas #specialty — come grab one!";
    const result = validateXPost({ text, hasImage: true });
    expect(result.issues.some((i) => i.rule === "too-many-hashtags")).toBe(true);
  });

  it("rewards threads", () => {
    const text = "Thread: How we source our beans from farm to cup 🧵 1/5 — It starts with relationships.";
    const result = validateXPost({ text, isThread: true, hasImage: true });
    expect(result.strengths.some((s) => s.includes("Thread"))).toBe(true);
  });

  it("rewards replies", () => {
    const text = "Absolutely — we just got a new batch in yesterday!";
    const result = validateXPost({ text, isReply: true });
    expect(result.strengths.some((s) => s.includes("Reply"))).toBe(true);
  });

  it("flags excessive caps", () => {
    const text = "FRESH ROAST JUST DROPPED COME GET IT BEFORE ITS GONE EVERYONE";
    const result = validateXPost({ text, hasImage: true });
    expect(result.issues.some((i) => i.rule === "all-caps")).toBe(true);
  });

  it("flags excessive emojis", () => {
    const text = "☕🔥✨🎉💪🤩🥳😍👌🏼 Fresh roast just dropped!";
    const result = validateXPost({ text, hasImage: true });
    expect(result.issues.some((i) => i.rule === "emoji-spam")).toBe(true);
  });

  it("rewards questions", () => {
    const text = "What's your go-to morning roast? We just restocked all three blends.";
    const result = validateXPost({ text, hasImage: true });
    expect(result.strengths.some((s) => s.includes("question"))).toBe(true);
  });

  it("rewards call-to-action words", () => {
    const text = "Stop by today and try our new seasonal lavender latte.";
    const result = validateXPost({ text, hasImage: true });
    expect(result.strengths.some((s) => s.includes("call-to-action"))).toBe(true);
  });

  it("warns on over-posting (>10 in 24h)", () => {
    const result = validateXPost({ text: "Another post", recentPostCount24h: 12 });
    expect(result.issues.some((i) => i.rule === "over-posting")).toBe(true);
  });

  it("rewards healthy cadence (2-5 posts in 24h)", () => {
    const result = validateXPost({ text: "Good morning!", recentPostCount24h: 3, hasImage: true });
    expect(result.strengths.some((s) => s.includes("cadence"))).toBe(true);
  });

  it("returns a verdict string", () => {
    const result = validateXPost({ text: "Hello world", hasImage: true });
    expect(["excellent", "good", "fair", "poor"]).toContain(result.verdict);
  });

  it("score is always 0-100", () => {
    const cases = [
      { text: "" },
      { text: "a".repeat(500) },
      { text: "Good post with image", hasImage: true, hasVideo: true, isThread: true },
    ];
    for (const c of cases) {
      const r = validateXPost(c);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("validateGenericPost", () => {
  it("validates character limits per platform", () => {
    const longText = "a".repeat(300);
    const result = validateGenericPost(longText, "twitter");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "char-limit")).toBe(true);
  });

  it("allows long posts on Facebook", () => {
    const text = "a".repeat(500);
    const result = validateGenericPost(text, "facebook");
    expect(result.valid).toBe(true);
  });

  it("requires media for Instagram", () => {
    const result = validateGenericPost("Great caption", "instagram", false);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "no-media")).toBe(true);
  });

  it("requires video for TikTok", () => {
    const result = validateGenericPost("Caption", "tiktok", false);
    expect(result.valid).toBe(false);
  });

  it("returns valid=true for unknown platforms", () => {
    const result = validateGenericPost("test", "myspace");
    expect(result.valid).toBe(true);
  });
});

describe("PLATFORM_LIMITS", () => {
  it("has limits for all expected platforms", () => {
    expect(PLATFORM_LIMITS.twitter.maxChars).toBe(280);
    expect(PLATFORM_LIMITS.instagram.maxChars).toBe(2200);
    expect(PLATFORM_LIMITS.bluesky.maxChars).toBe(300);
    expect(PLATFORM_LIMITS.youtube.maxChars).toBe(5000);
  });
});

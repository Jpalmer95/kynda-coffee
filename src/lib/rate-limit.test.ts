import { describe, it, expect } from "vitest";
import { rateLimit, checkRateLimit, getClientIp } from "./rate-limit";

describe("rateLimit", () => {
  it("allows the first request and sets remaining to max - 1", () => {
    const result = rateLimit("192.168.1.1", { identifier: "test-first", windowMs: 10_000, maxRequests: 5 });
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("allows requests up to the max limit", () => {
    const ip = "192.168.1.2";
    const identifier = "test-max";
    for (let i = 0; i < 4; i++) {
      const result = rateLimit(ip, { identifier, windowMs: 10_000, maxRequests: 5 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
    const final = rateLimit(ip, { identifier, windowMs: 10_000, maxRequests: 5 });
    expect(final.success).toBe(true);
    expect(final.remaining).toBe(0);
  });

  it("blocks requests that exceed the max limit", () => {
    const ip = "192.168.1.3";
    const identifier = "test-block";
    for (let i = 0; i < 5; i++) {
      rateLimit(ip, { identifier, windowMs: 10_000, maxRequests: 5 });
    }
    const blocked = rateLimit(ip, { identifier, windowMs: 10_000, maxRequests: 5 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.limit).toBe(5);
  });

  it("resets the counter after the window expires", async () => {
    const ip = "192.168.1.4";
    const identifier = "test-reset";
    const windowMs = 50;
    rateLimit(ip, { identifier, windowMs, maxRequests: 1 });
    const blocked = rateLimit(ip, { identifier, windowMs, maxRequests: 1 });
    expect(blocked.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 20));
    const reset = rateLimit(ip, { identifier, windowMs, maxRequests: 1 });
    expect(reset.success).toBe(true);
    expect(reset.remaining).toBe(0);
  });

  it("isolates different IPs", () => {
    rateLimit("10.0.0.1", { identifier: "test-isolate", windowMs: 10_000, maxRequests: 1 });
    const other = rateLimit("10.0.0.2", { identifier: "test-isolate", windowMs: 10_000, maxRequests: 1 });
    expect(other.success).toBe(true);
  });

  it("isolates different identifiers for the same IP", () => {
    rateLimit("10.0.0.3", { identifier: "id-a", windowMs: 10_000, maxRequests: 1 });
    const other = rateLimit("10.0.0.3", { identifier: "id-b", windowMs: 10_000, maxRequests: 1 });
    expect(other.success).toBe(true);
  });
});

describe("checkRateLimit", () => {
  it("returns allowed and remaining for backward-compatible calls", () => {
    const result = checkRateLimit("10.0.0.4", 3, 10_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("uses defaults when maxRequests and windowMs are omitted", () => {
    const result = checkRateLimit("10.0.0.5");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip header", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("falls back to unknown when no headers are present", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
      },
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });
});

import { describe, it, expect } from "vitest";
import {
  sanitizeRedirectPath,
  sanitizeSameOriginUrl,
  timingSafeStringEqual,
  escapeHtml,
  sanitizePostgrestSearch,
  generateSecureCode,
  validateExternalApiBase,
} from "./security";

describe("sanitizeRedirectPath", () => {
  it("allows valid relative paths with query strings and hashes", () => {
    expect(sanitizeRedirectPath("/account/orders?page=2#top")).toBe("/account/orders?page=2#top");
    expect(sanitizeRedirectPath("/kds")).toBe("/kds");
  });

  it("blocks external, protocol-relative, and backslash open redirects", () => {
    expect(sanitizeRedirectPath("https://evil.com/phish")).toBe("/account");
    expect(sanitizeRedirectPath("//evil.com/phish")).toBe("/account");
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/account");
    expect(sanitizeRedirectPath("", "/kds")).toBe("/kds");
    expect(sanitizeRedirectPath(null, "/kds")).toBe("/kds");
  });
});

describe("sanitizeSameOriginUrl", () => {
  const origin = "https://kyndacoffee.com";

  it("permits same-origin URLs and relative paths", () => {
    expect(
      sanitizeSameOriginUrl("https://kyndacoffee.com/shop/checkout?success=true", "/shop/cart", origin)
    ).toBe("https://kyndacoffee.com/shop/checkout?success=true");
    expect(sanitizeSameOriginUrl("/shop/cart", "/shop", origin)).toBe("https://kyndacoffee.com/shop/cart");
  });

  it("rejects off-origin URLs and falls back safely", () => {
    expect(
      sanitizeSameOriginUrl("https://attacker.example/steal", "/shop/checkout?success=true", origin)
    ).toBe("https://kyndacoffee.com/shop/checkout?success=true");
    expect(
      sanitizeSameOriginUrl("//attacker.example/steal", "/shop/cart", origin)
    ).toBe("https://kyndacoffee.com/shop/cart");
  });
});

describe("timingSafeStringEqual", () => {
  it("matches identical non-empty strings and rejects mismatches or empties", () => {
    expect(timingSafeStringEqual("secret-token-123", "secret-token-123")).toBe(true);
    expect(timingSafeStringEqual("secret-token-123", "secret-token-124")).toBe(false);
    expect(timingSafeStringEqual("short", "much-longer-string")).toBe(false);
    expect(timingSafeStringEqual("", "")).toBe(false);
    expect(timingSafeStringEqual(null, "abc")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml(`<script>alert("x" & 'y')</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;"
    );
  });
});

describe("sanitizePostgrestSearch", () => {
  it("strips PostgREST filter syntax characters", () => {
    expect(sanitizePostgrestSearch("latte,cost_cents.gt.500,name.ilike.%a")).toBe(
      "lattecost_centsgt500nameilikea"
    );
    expect(sanitizePostgrestSearch("Oat Milk Latte")).toBe("Oat Milk Latte");
  });
});

describe("generateSecureCode", () => {
  it("generates high-entropy codes with the expected prefix and length", () => {
    const code = generateSecureCode("KYN-", 12);
    expect(code).toMatch(/^KYN-[A-HJ-NP-Z2-9]{12}$/);
  });
});

describe("validateExternalApiBase", () => {
  it("allows HTTPS remote endpoints and blocks metadata/private IPs", () => {
    expect(validateExternalApiBase("https://router.huggingface.co/v1", false).ok).toBe(true);
    expect(validateExternalApiBase("http://169.254.169.254/latest/meta-data", true).ok).toBe(false);
    expect(validateExternalApiBase("http://metadata.google.internal", true).ok).toBe(false);
    expect(validateExternalApiBase("http://10.0.0.1:8080/v1", true).ok).toBe(false);
    expect(validateExternalApiBase("http://127.0.0.1:1234/v1", false).ok).toBe(false);
    expect(validateExternalApiBase("http://127.0.0.1:1234/v1", true).ok).toBe(true);
  });
});

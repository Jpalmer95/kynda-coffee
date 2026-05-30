import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveProviderName, getPaymentProvider, __resetPaymentProviderForTests } from "./index";

afterEach(() => {
  __resetPaymentProviderForTests();
  delete process.env.PAYMENT_PROVIDER;
  vi.restoreAllMocks();
});

describe("resolveProviderName", () => {
  it("defaults to stripe when unset", () => {
    expect(resolveProviderName(undefined)).toBe("stripe");
    expect(resolveProviderName("")).toBe("stripe");
  });

  it("accepts known providers case-insensitively", () => {
    expect(resolveProviderName("square")).toBe("square");
    expect(resolveProviderName("Stripe")).toBe("stripe");
    expect(resolveProviderName("  SQUARE  ")).toBe("square");
  });

  it("falls back to stripe on unknown value (never offline)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveProviderName("paypal")).toBe("stripe");
  });
});

describe("getPaymentProvider factory", () => {
  it("returns the Stripe provider by default", () => {
    expect(getPaymentProvider().name).toBe("stripe");
  });

  it("returns the Square provider when PAYMENT_PROVIDER=square", () => {
    process.env.PAYMENT_PROVIDER = "square";
    __resetPaymentProviderForTests();
    expect(getPaymentProvider().name).toBe("square");
  });

  it("caches the singleton across calls", () => {
    const a = getPaymentProvider();
    const b = getPaymentProvider();
    expect(a).toBe(b);
  });

  it("both providers implement the PaymentProvider interface", () => {
    process.env.PAYMENT_PROVIDER = "square";
    __resetPaymentProviderForTests();
    const sq = getPaymentProvider();
    expect(typeof sq.createCheckoutSession).toBe("function");
    expect(typeof sq.verifyAndParseWebhook).toBe("function");
  });
});

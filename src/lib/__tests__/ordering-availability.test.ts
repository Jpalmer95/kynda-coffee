import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isCafeOrderingEnabled,
  resolveCafeOrderingEnabled,
  ORDERING_PAUSED_NOTICE,
  ORDERING_PAUSED_API_MESSAGE,
} from "@/lib/ordering/availability";

/**
 * Café ordering pause guards (relocation, Sept 2026 → Winter 2026 reopening).
 *
 * The shop is closed, so café ordering must fail CLOSED: an unset or unparsable
 * flag pauses ordering, and the pause has to be enforced on every surface —
 * including the API, not just the menu UI.
 */

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("cafe ordering availability", () => {
  it("is paused by default (fails closed)", () => {
    expect(isCafeOrderingEnabled(undefined)).toBe(false);
    expect(isCafeOrderingEnabled("")).toBe(false);
    expect(isCafeOrderingEnabled("false")).toBe(false);
    expect(isCafeOrderingEnabled("0")).toBe(false);
    expect(isCafeOrderingEnabled("no")).toBe(false);
    expect(isCafeOrderingEnabled("paused")).toBe(false);
  });

  it("enables only for explicit truthy values", () => {
    for (const raw of ["1", "true", "TRUE", " True ", "yes", "on"]) {
      expect(isCafeOrderingEnabled(raw), raw).toBe(true);
    }
  });

  it("resolves the runtime env var, with the public var as fallback", () => {
    const saved = {
      runtime: process.env.CAFE_ORDERING_ENABLED,
      publicVar: process.env.NEXT_PUBLIC_CAFE_ORDERING_ENABLED,
    };
    try {
      delete process.env.CAFE_ORDERING_ENABLED;
      delete process.env.NEXT_PUBLIC_CAFE_ORDERING_ENABLED;
      expect(resolveCafeOrderingEnabled()).toBe(false);

      process.env.NEXT_PUBLIC_CAFE_ORDERING_ENABLED = "true";
      expect(resolveCafeOrderingEnabled()).toBe(true);

      // The non-public runtime var wins when both are present.
      process.env.CAFE_ORDERING_ENABLED = "false";
      expect(resolveCafeOrderingEnabled()).toBe(false);

      process.env.CAFE_ORDERING_ENABLED = "true";
      expect(resolveCafeOrderingEnabled()).toBe(true);
    } finally {
      for (const [key, value] of Object.entries({
        CAFE_ORDERING_ENABLED: saved.runtime,
        NEXT_PUBLIC_CAFE_ORDERING_ENABLED: saved.publicVar,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

describe("ordering paused notice", () => {
  it("links to the relocation page and the shipping shop", () => {
    expect(ORDERING_PAUSED_NOTICE.ctaHref).toBe("/moving");
    expect(ORDERING_PAUSED_NOTICE.shopHref).toBe("/shop");
  });

  it("promises the Winter 2026 reopening and names the new address", () => {
    expect(ORDERING_PAUSED_NOTICE.body).toContain("Winter 2026");
    expect(ORDERING_PAUSED_NOTICE.menuBody).toContain("Winter 2026");
    expect(ORDERING_PAUSED_NOTICE.menuBody).toContain("4909 RM 2147");
  });

  it("tells API callers that the shop channel is still open", () => {
    expect(ORDERING_PAUSED_API_MESSAGE).toMatch(/paused/i);
    expect(ORDERING_PAUSED_API_MESSAGE).toMatch(/coffee beans|merch/i);
  });
});

describe("cafe ordering pause is enforced on every surface", () => {
  it("/menu passes the flag down and renders the paused notice", () => {
    const page = read("src/app/menu/page.tsx");
    expect(page).toContain("CAFE_ORDERING_ENABLED");
    expect(page).toContain("OrderingPausedNotice");
    expect(page).toContain("orderingEnabled={ordering}");
  });

  it("MenuClient keeps the catalog browsable but inert when paused", () => {
    const client = read("src/components/menu/MenuClient.tsx");
    expect(client).toContain("orderingEnabled: boolean");
    expect(client).toContain("disabled={!orderingEnabled}");
    // The add-to-cart dialog only mounts while ordering is enabled.
    expect(client).toMatch(/\{orderingEnabled && \(\s*<MenuItemDialog/);
    expect(client).toMatch(/orderingEnabled \? \(\s*<>/);
  });

  it("/order never renders the ordering client while paused", () => {
    const page = read("src/app/order/page.tsx");
    expect(page).toContain("CAFE_ORDERING_ENABLED");
    expect(page).toMatch(/if \(!CAFE_ORDERING_ENABLED\) \{/);
    expect(page).toContain("OrderingPausedNotice");
  });

  it("/api/orders/submit rejects café orders server-side", () => {
    const route = read("src/app/api/orders/submit/route.ts");
    expect(route).toContain("ORDERING_PAUSED_API_MESSAGE");
    expect(route).toMatch(/if \(!CAFE_ORDERING_ENABLED\) \{/);
    expect(route).toContain("status: 403");
  });

  it("passes the flag into client components as a prop (no browser env reads)", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toMatch(/<CartDrawer cafeOrderingEnabled=\{CAFE_ORDERING_ENABLED\} \/>/);

    const drawer = read("src/components/cart/CartDrawer.tsx");
    expect(drawer).toContain("cafeOrderingEnabled");
    // A client component must not import the availability module directly —
    // process.env is not readable in the browser.
    expect(drawer).not.toContain("@/lib/ordering/availability");
    expect(read("src/components/menu/MenuClient.tsx")).not.toContain(
      "@/lib/ordering/availability"
    );
  });

  it("leaves the shipping shop untouched", () => {
    for (const rel of [
      "src/app/api/checkout/route.ts",
      "src/app/api/merch-checkout/route.ts",
    ]) {
      expect(read(rel)).not.toContain("CAFE_ORDERING_ENABLED");
    }
  });
});

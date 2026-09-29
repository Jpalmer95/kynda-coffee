/**
 * Café online-ordering availability — single source of truth.
 *
 * Context: the original leased shop is closed while we build the new owned
 * location (4909 RM 2147, Horseshoe Bay). Until the Winter 2026 reopening, every
 * in-store ordering surface is PAUSED:
 *
 *   - /menu        → browse-only (no add-to-cart, static item cards)
 *   - /order       → shows the paused notice instead of the ordering client
 *   - /qr-order    → redirects to /order, so it inherits the same pause
 *   - /api/orders/submit → hard 403 guard (defense in depth, server-side)
 *
 * Shipping channels stay LIVE on purpose — /shop, /shop/merch and coffee beans
 * can be fulfilled throughout the relocation.
 *
 * Toggle for the Winter 2026 reopening: set CAFE_ORDERING_ENABLED=true in the
 * app env (Coolify) and restart. The value is read SERVER-SIDE at runtime and
 * passed into client components as a prop, so re-opening never depends on a
 * rebuild. Unset/false = paused, so a missing env var can never silently
 * re-open ordering on a closed shop.
 */

const TRUTHY = new Set(["1", "true", "yes", "on"]);

/** Pure predicate so tests can drive it without touching process.env. */
export function isCafeOrderingEnabled(raw: string | undefined | null): boolean {
  return TRUTHY.has(String(raw ?? "").trim().toLowerCase());
}

/**
 * Resolved server-side at runtime. `CAFE_ORDERING_ENABLED` is the runtime
 * switch; `NEXT_PUBLIC_CAFE_ORDERING_ENABLED` is accepted as a fallback for
 * environments that only wired up the public var.
 *
 * Client components must receive this as a prop (see CartDrawer/MenuClient) —
 * never re-read process.env in the browser.
 */
export function resolveCafeOrderingEnabled(): boolean {
  return isCafeOrderingEnabled(
    process.env.CAFE_ORDERING_ENABLED ?? process.env.NEXT_PUBLIC_CAFE_ORDERING_ENABLED
  );
}

export const CAFE_ORDERING_ENABLED = resolveCafeOrderingEnabled();

/**
 * Copy for the paused notice. Kept here so the menu page and the order page
 * never drift apart.
 */
export const ORDERING_PAUSED_NOTICE = {
  eyebrow: "We're relocating",
  title: "Online ordering is paused",
  body:
    "Our original shop is now closed while we build the new Kynda Coffee at " +
    "4909 RM 2147 in Horseshoe Bay. Café ordering reopens with the new shop " +
    "this Winter 2026 — browse the full menu below in the meantime.",
  menuBody:
    "Our original shop is now closed while we build the new Kynda Coffee at " +
    "4909 RM 2147 in Horseshoe Bay, one minute down the road. Nothing can be " +
    "added to a cart right now — we reopen for ordering this Winter 2026.",
  ctaLabel: "See the relocation details & renders",
  ctaHref: "/moving",
  shopLabel: "Shop coffee beans & merch",
  shopHref: "/shop",
} as const;

/** Message returned by the ordering APIs while the pause is active. */
export const ORDERING_PAUSED_API_MESSAGE =
  "Online ordering for our café menu is paused while we relocate. Coffee beans and merch can still be ordered on our shop pages. We reopen this Winter 2026.";

/**
 * Monthly Specials — shared logic (Roadmap V2 — Epic 5).
 *
 * Pure, unit-testable helpers for the single-source-of-truth `specials` records
 * that drive BOTH the Menu specials section and marketing campaigns. The owner
 * curates specials with an optional date window; these helpers decide which are
 * "live" right now and shape them for display.
 */

export interface Special {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  provider_item_id: string | null;
  provider_variation_id: string | null;
  image_url: string | null;
  price_cents: number | null;
  compare_at_cents: number | null;
  badge: string | null;
  cta_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  marketing_generated?: boolean;
}

/**
 * Is this special live at the given instant?
 * - must be is_active
 * - now must be >= starts_at (or starts_at null = active immediately)
 * - now must be <= ends_at (or ends_at null = no expiry)
 */
export function isSpecialLive(special: Pick<Special, "is_active" | "starts_at" | "ends_at">, nowMs = Date.now()): boolean {
  if (!special.is_active) return false;
  if (special.starts_at) {
    const start = new Date(special.starts_at).getTime();
    if (!Number.isNaN(start) && nowMs < start) return false;
  }
  if (special.ends_at) {
    const end = new Date(special.ends_at).getTime();
    if (!Number.isNaN(end) && nowMs > end) return false;
  }
  return true;
}

/** Filter + sort the specials that should be shown right now. */
export function activeSpecials(specials: Special[], nowMs = Date.now()): Special[] {
  return specials
    .filter((s) => isSpecialLive(s, nowMs))
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.title.localeCompare(b.title);
    });
}

/** Discount percentage if a compare-at price is set and higher than price. */
export function discountPct(special: Pick<Special, "price_cents" | "compare_at_cents">): number | null {
  const { price_cents, compare_at_cents } = special;
  if (!price_cents || !compare_at_cents || compare_at_cents <= price_cents) return null;
  return Math.round(((compare_at_cents - price_cents) / compare_at_cents) * 100);
}

/**
 * Build a marketing seed from a special — the structured brief an agent (or the
 * owner) turns into social drafts + newsletter copy. Kept here so the menu and
 * the marketing pipeline derive campaigns from the same record.
 */
export interface SpecialMarketingSeed {
  specialId: string;
  headline: string;
  body: string;
  badge: string | null;
  imageUrl: string | null;
  callToAction: string;
  discountPct: number | null;
}

export function marketingSeedForSpecial(special: Special): SpecialMarketingSeed {
  const disc = discountPct(special);
  const bodyParts = [special.subtitle, special.description].filter(Boolean) as string[];
  return {
    specialId: special.id,
    headline: special.title,
    body: bodyParts.join(" — ") || special.title,
    badge: special.badge,
    imageUrl: special.image_url,
    callToAction: special.cta_label || "Order now",
    discountPct: disc,
  };
}

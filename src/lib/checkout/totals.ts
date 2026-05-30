/**
 * Cart / order totals — the money path (Roadmap V2 — Epic 11, reliability).
 *
 * Pure, exhaustively-tested computation of what a customer is charged. Pulling
 * this out of the checkout route closes a real risk: discounts + loyalty
 * redemption were summed ad-hoc and could drive an order negative or be abused.
 *
 * Invariants enforced here:
 *  - subtotal = Σ(unit_price_cents × quantity), never negative.
 *  - total adjustments (promo discount + loyalty value) are CLAMPED so the
 *    discounted subtotal can never go below zero.
 *  - tax is computed on the discounted subtotal (post-discount), never negative.
 *  - shipping uses the free-shipping threshold on the discounted subtotal.
 *  - grand total = discountedSubtotal + tax + shipping, always ≥ 0.
 *  - every returned number is a non-negative integer (cents).
 */

export interface CartLine {
  unitPriceCents: number;
  quantity: number;
}

export interface TotalsInput {
  lines: CartLine[];
  discountCents?: number; // promo / coupon
  loyaltyValueCents?: number; // dollar value of redeemed points
  taxRate?: number; // e.g. 0.0825
  freeShippingThresholdCents?: number;
  flatShippingCents?: number;
  /** When true (e.g. pickup/digital), no shipping is charged. */
  skipShipping?: boolean;
}

export interface TotalsResult {
  subtotalCents: number;
  /** Discount actually applied (clamped to subtotal). */
  appliedDiscountCents: number;
  /** Loyalty value actually applied (clamped to remaining after discount). */
  appliedLoyaltyCents: number;
  discountedSubtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

function intCents(n: number | undefined | null): number {
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * Compute order totals with all money-path invariants enforced. Adjustments are
 * applied in order — promo discount first, then loyalty — each clamped to the
 * remaining balance so the discounted subtotal floors at 0.
 */
export function computeOrderTotals(input: TotalsInput): TotalsResult {
  const subtotalCents = (input.lines ?? []).reduce((sum, l) => {
    const unit = intCents(l.unitPriceCents);
    const qty = Math.max(0, Math.trunc(l.quantity ?? 0));
    return sum + unit * qty;
  }, 0);

  // Promo discount, clamped to subtotal.
  const requestedDiscount = intCents(input.discountCents);
  const appliedDiscountCents = Math.min(requestedDiscount, subtotalCents);

  // Loyalty, clamped to what's left after the discount.
  const afterDiscount = subtotalCents - appliedDiscountCents;
  const requestedLoyalty = intCents(input.loyaltyValueCents);
  const appliedLoyaltyCents = Math.min(requestedLoyalty, afterDiscount);

  const discountedSubtotalCents = Math.max(0, subtotalCents - appliedDiscountCents - appliedLoyaltyCents);

  // Tax on the discounted subtotal.
  const taxRate = typeof input.taxRate === "number" && input.taxRate > 0 ? input.taxRate : 0;
  const taxCents = Math.max(0, Math.round(discountedSubtotalCents * taxRate));

  // Shipping: free at/over threshold (measured on the discounted subtotal), else flat.
  let shippingCents = 0;
  if (!input.skipShipping) {
    const threshold = intCents(input.freeShippingThresholdCents);
    const flat = intCents(input.flatShippingCents);
    // threshold of 0 means "no free-shipping rule" → always charge flat.
    const qualifiesFree = threshold > 0 && discountedSubtotalCents >= threshold;
    shippingCents = qualifiesFree ? 0 : flat;
    // Don't charge shipping on an empty/zero order.
    if (discountedSubtotalCents === 0) shippingCents = 0;
  }

  const totalCents = discountedSubtotalCents + taxCents + shippingCents;

  return {
    subtotalCents,
    appliedDiscountCents,
    appliedLoyaltyCents,
    discountedSubtotalCents,
    taxCents,
    shippingCents,
    totalCents,
  };
}

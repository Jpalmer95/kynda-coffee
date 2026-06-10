import { NextRequest, NextResponse } from "next/server";
import {
  PRINTFUL_CATALOG,
  PRODUCT_MARKUP,
} from "@/lib/printful/catalog";
import { calculatePrice } from "@/lib/pricing/engine";
import { getEffectivePricingProfile } from "@/lib/pricing/rules";

/** Map a Printful catalog category to a Kynda pricing profile key. */
const PRINTFUL_TO_PRICING_PROFILE: Record<string, string> = {
  apparel: "merch-apparel",
  drinkware: "merch-mugs",
  accessories: "merch-accessories",
  "wall-art": "design-studio",
  "home-living": "design-studio",
};

/**
 * POST /api/printful/estimate
 *
 * Returns estimated shipping cost + retail price breakdown for a product
 * so the user can see the full cost before checkout.
 *
 * Body:
 *   { product_id: string, variant_id?: number, recipient?: { zip, country_code } }
 *
 * Response:
 *   {
 *     product_base_cents: number,      // Printful wholesale
 *     retail_cents: number,            // What user pays (incl. shipping buffer)
 *     shipping_buffer_cents: number,   // Kynda's built-in shipping buffer
 *     estimated_profit_cents: number,  // Kynda's margin after Printful cost+shipping
 *     shipping_options?: [ ... ],      // Live Printful rates if recipient provided
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, variant_id, recipient } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    const product = PRINTFUL_CATALOG.find((p) => p.id === product_id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const variant = variant_id
      ? product.variants.find((v) => v.id === variant_id)
      : undefined;

    const baseCost =
      product.basePriceCents + (variant?.additionalPriceCents || 0);
    const markup = PRODUCT_MARKUP[product.category];

    // If recipient provided AND Printful API key exists, fetch live rates
    let shippingOptions: any[] = [];
    if (
      recipient &&
      recipient.zip &&
      recipient.country_code &&
      process.env.PRINTFUL_API_KEY
    ) {
      try {
        const res = await fetch("https://api.printful.com/shipping/rates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          },
          body: JSON.stringify({
            recipient: {
              country_code: recipient.country_code,
              state_code: recipient.state_code || "",
              city: recipient.city || "",
              zip: recipient.zip,
            },
            items: [
              {
                variant_id: variant?.id || product.variants[0]?.id || 0,
                quantity: 1,
              },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          shippingOptions = (data.result || []).map((opt: any) => ({
            id: opt.id,
            name: opt.name,
            rate_cents: Math.round(parseFloat(opt.rate) * 100),
            currency: opt.currency,
            min_delivery_days: opt.min_delivery_days,
            max_delivery_days: opt.max_delivery_days,
          }));
        }
      } catch (err) {
        // Non-fatal — just skip live rates
        console.warn("Live Printful shipping estimate failed:", err);
      }
    }

    // Profit-guaranteed pricing (Epic 2). Use the cheapest live shipping rate
    // when we have one; otherwise fall back to the category profile's buffer.
    const profileKey = PRINTFUL_TO_PRICING_PROFILE[product.category] ?? "design-studio";
    const profile = await getEffectivePricingProfile(profileKey);
    const liveShippingCents =
      shippingOptions.length > 0
        ? Math.min(...shippingOptions.map((o) => o.rate_cents))
        : undefined;

    const pricing = calculatePrice({
      costCents: baseCost,
      shippingCents: liveShippingCents ?? profile.shippingBufferCents,
      targetMarginPct: profile.targetMarginPct,
      minProfitCents: profile.minProfitCents,
      rounding: profile.rounding,
    });

    const retailCents = pricing.retailCents;
    const profitCents = pricing.profitCents;

    return NextResponse.json({
      product_id: product.id,
      product_name: product.name,
      variant: variant
        ? { id: variant.id, size: variant.size, color: variant.colorName }
        : null,
      product_base_cents: baseCost,
      shipping_buffer_cents: liveShippingCents ?? profile.shippingBufferCents,
      retail_cents: retailCents,
      estimated_markup: markup.multiplier,
      estimated_profit_cents: Math.max(0, profitCents),
      shipping_options: shippingOptions,
      // Epic 2 — transparent, profit-guaranteed pricing detail
      pricing: {
        target_margin_pct: profile.targetMarginPct,
        realized_margin_pct: Number(pricing.marginPct.toFixed(4)),
        unit_cost_cents: pricing.unitCostCents,
        payment_fee_cents: pricing.paymentFeeCents,
        meets_target: pricing.meetsTarget,
        profitable: pricing.profitable,
        breakdown: pricing.breakdown,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

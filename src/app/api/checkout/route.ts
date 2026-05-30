import { NextRequest, NextResponse } from "next/server";
import { stripe, STORE_CONFIG } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getPosCatalog, mapPosCatalogItemToProduct } from "@/lib/pos/catalog";
import { computeOrderTotals } from "@/lib/checkout/totals";
import { z } from "zod";

// Force dynamic — don't try to build statically (needs env vars at runtime)
export const dynamic = "force-dynamic";

// Product IDs come from two sources:
//   - legacy `products` table → bare UUID
//   - normalized POS catalog  → "pos:<uuid>" (see mapPosCatalogItemToProduct)
// Accept either shape; the lookup below resolves both.
const checkoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      quantity: z.number().int().positive(),
      variant: z
        .object({
          size: z.string().optional(),
          color: z.string().optional(),
          grind: z.string().optional(),
        })
        .optional(),
    })
  ).min(1),
  customer_email: z.string().email(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  promo_code: z.string().optional(),
  gift_card_id: z.string().optional(),
  discount_cents: z.number().int().min(0).optional(),
  // Loyalty redemption
  loyalty_points_redeemed: z.number().int().min(0).optional(),
  loyalty_points_value_cents: z.number().int().min(0).optional(),
});

interface ResolvedProduct {
  id: string;
  name: string;
  description?: string | null;
  images?: string[] | null;
  price_cents: number;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "checkout", windowMs: 60_000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } });
    }

    const body = await req.json();
    const parsed = checkoutSchema.parse(body);

    // Resolve every requested product. Items may be legacy `products` rows
    // (bare UUID) or POS catalog items ("pos:<uuid>").
    const resolved = new Map<string, ResolvedProduct>();

    // 1) Legacy products table — query the bare UUIDs only.
    const legacyIds = parsed.items
      .map((i) => i.product_id)
      .filter((id) => !id.startsWith("pos:"));

    if (legacyIds.length > 0) {
      const { data: products } = await supabaseAdmin()
        .from("products")
        .select("*")
        .in("id", legacyIds)
        .eq("is_active", true);

      for (const p of products ?? []) {
        resolved.set((p as any).id, {
          id: (p as any).id,
          name: (p as any).name,
          description: (p as any).description,
          images: (p as any).images,
          price_cents: (p as any).price_cents,
        });
      }
    }

    // 2) POS catalog — needed for any "pos:" ids OR any legacy id we couldn't
    //    find above (the shop merges POS items into the products list, so most
    //    shop items resolve here).
    const needsPos = parsed.items.some(
      (i) => i.product_id.startsWith("pos:") || !resolved.has(i.product_id)
    );

    if (needsPos) {
      try {
        const catalog = await getPosCatalog({ channel: "shop", includeModifiers: false, limit: 500 });
        for (const item of catalog.items) {
          const mapped = mapPosCatalogItemToProduct(item);
          resolved.set(mapped.id, {
            id: mapped.id,
            name: mapped.name,
            description: mapped.description,
            images: mapped.images,
            price_cents: mapped.price_cents,
          });
        }
      } catch (posErr) {
        console.error("Checkout: failed to load POS catalog", posErr);
      }
    }

    // Build Stripe line items, validating each item resolves.
    const lineItems: any[] = [];
    const missing: string[] = [];
    for (const item of parsed.items) {
      const product = resolved.get(item.product_id);
      if (!product) {
        missing.push(item.product_id);
        continue;
      }
      lineItems.push({
        price_data: {
          currency: STORE_CONFIG.currency,
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: (product.images ?? []).filter(Boolean).slice(0, 1),
          },
          unit_amount: product.price_cents,
        },
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0 || missing.length > 0) {
      return NextResponse.json(
        { error: "Some items are no longer available. Please refresh your cart and try again." },
        { status: 400 }
      );
    }

    // Calculate totals for shipping logic.
    const subtotal = parsed.items.reduce((sum, item) => {
      const product = resolved.get(item.product_id);
      return sum + (product ? product.price_cents * item.quantity : 0);
    }, 0);

    // Money path: clamp discount + loyalty so the order can never go negative or
    // over-redeem (validated pure module — see src/lib/checkout/totals.ts).
    const totals = computeOrderTotals({
      lines: parsed.items
        .map((item) => {
          const product = resolved.get(item.product_id);
          return product ? { unitPriceCents: product.price_cents, quantity: item.quantity } : null;
        })
        .filter((l): l is { unitPriceCents: number; quantity: number } => l !== null),
      discountCents: parsed.discount_cents ?? 0,
      loyaltyValueCents: parsed.loyalty_points_value_cents ?? 0,
      freeShippingThresholdCents: STORE_CONFIG.free_shipping_threshold_cents,
      flatShippingCents: STORE_CONFIG.flat_shipping_cents,
    });

    const discount_cents = totals.appliedDiscountCents;
    const adjustedSubtotal = totals.discountedSubtotalCents;

    // Prepare line items — add discount and loyalty as negative line items
    const finalLineItems = [...lineItems];
    if (discount_cents > 0) {
      finalLineItems.push({
        price_data: {
          currency: STORE_CONFIG.currency,
          product_data: {
            name: parsed.promo_code ? `Promo: ${parsed.promo_code}` : "Discount",
            description: "Applied at checkout",
          },
          unit_amount: -discount_cents,
        },
        quantity: 1,
      });
    }

    const loyaltyPointsRedeemed = parsed.loyalty_points_redeemed ?? 0;
    // Use the CLAMPED loyalty value so discount + loyalty can't exceed subtotal.
    const loyaltyValueCents = totals.appliedLoyaltyCents;
    if (loyaltyValueCents > 0) {
      finalLineItems.push({
        price_data: {
          currency: STORE_CONFIG.currency,
          product_data: {
            name: "Loyalty Points Redemption",
            description: `${loyaltyPointsRedeemed} points redeemed`,
          },
          unit_amount: -loyaltyValueCents,
        },
        quantity: 1,
      });
    }

    const metadata: Record<string, string> = {
      source: "kynda-website",
      subtotal_cents: String(subtotal),
    };
    if (parsed.promo_code) metadata.promo_code = parsed.promo_code;
    if (parsed.gift_card_id) metadata.gift_card_id = parsed.gift_card_id;
    if (loyaltyPointsRedeemed > 0) {
      metadata.loyalty_points_redeemed = String(loyaltyPointsRedeemed);
      metadata.loyalty_value_cents = String(loyaltyValueCents);
    }

    // Create Stripe Checkout Session
    const stripeClient = stripe();
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      customer_email: parsed.customer_email,
      line_items: finalLineItems,
      success_url: `${parsed.success_url}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: parsed.cancel_url,
      // Apple Pay / Google Pay / Link / card are enabled automatically for
      // Checkout Sessions via the Stripe Dashboard payment-method settings.
      // (automatic_payment_methods is a PaymentIntent-only param — passing it
      // to checkout.sessions.create throws "Received unknown parameter".)
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: adjustedSubtotal >= STORE_CONFIG.free_shipping_threshold_cents ? 0 : STORE_CONFIG.flat_shipping_cents,
              currency: STORE_CONFIG.currency,
            },
            display_name:
              adjustedSubtotal >= STORE_CONFIG.free_shipping_threshold_cents
                ? "Free Shipping"
                : "Standard Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
      ],
      metadata,
    } as any);

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    if (err instanceof z.ZodError) {
      // Never leak the raw Zod error array to the client — rendering an array
      // of error objects as a React child throws minified error #31.
      return NextResponse.json(
        { error: "Invalid checkout request. Please refresh your cart and try again." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}

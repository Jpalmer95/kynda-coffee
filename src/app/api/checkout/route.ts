import { NextRequest, NextResponse } from "next/server";
import { stripe, STORE_CONFIG } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

// Force dynamic — don't try to build statically (needs env vars at runtime)
export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
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
  gift_card_id: z.string().uuid().optional(),
  discount_cents: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "checkout", windowMs: 60_000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } });
    }

    const body = await req.json();
    const parsed = checkoutSchema.parse(body);

    // Fetch products from Supabase
    const productIds = parsed.items.map((i) => i.product_id);
    const { data: products, error } = await supabaseAdmin()
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("is_active", true);

    if (error || !products || products.length === 0) {
      return NextResponse.json({ error: "Products not found" }, { status: 404 });
    }

    // Build Stripe line items
    const lineItems = parsed.items.map((item) => {
      const product = products.find((p: any) => p.id === item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      return {
        price_data: {
          currency: STORE_CONFIG.currency,
          product_data: {
            name: (product as any).name,
            description: (product as any).description ?? "",
            images: ((product as any).images ?? []).slice(0, 1),
          },
          unit_amount: (product as any).price_cents,
        },
        quantity: item.quantity,
      };
    });

    // Calculate totals for order record
    const subtotal = parsed.items.reduce((sum, item) => {
      const product = products.find((p: any) => p.id === item.product_id)!;
      return sum + (product as any).price_cents * item.quantity;
    }, 0);

    const discount_cents = parsed.discount_cents ?? 0;
    const adjustedSubtotal = Math.max(0, subtotal - discount_cents);

    // Prepare line items — add discount as a separate negative line item if applicable
    const finalLineItems = [...lineItems];
    if (discount_cents > 0) {
      finalLineItems.push({
        price_data: {
          currency: STORE_CONFIG.currency,
          product_data: {
            name: parsed.promo_code ? `Promo: ${parsed.promo_code}` : "Discount",
            description: "Applied at checkout",
            images: [],
          },
          unit_amount: -discount_cents,
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

    // Create Stripe Checkout Session
    const stripeClient = stripe();
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      customer_email: parsed.customer_email,
      line_items: finalLineItems,
      success_url: `${parsed.success_url}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: parsed.cancel_url,
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
    });

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

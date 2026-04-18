import { NextRequest, NextResponse } from "next/server";
import { stripe, STORE_CONFIG } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
});

export async function POST(req: NextRequest) {
  try {
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

    // Create Stripe Checkout Session
    const stripeClient = stripe();
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      customer_email: parsed.customer_email,
      line_items: lineItems,
      success_url: `${parsed.success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: parsed.cancel_url,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: subtotal >= STORE_CONFIG.free_shipping_threshold_cents ? 0 : STORE_CONFIG.flat_shipping_cents,
              currency: STORE_CONFIG.currency,
            },
            display_name:
              subtotal >= STORE_CONFIG.free_shipping_threshold_cents
                ? "Free Shipping"
                : "Standard Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
      ],
      metadata: {
        source: "kynda-website",
      },
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

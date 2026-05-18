import { NextRequest, NextResponse } from "next/server";
import { stripe, STORE_CONFIG } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  product_id: z.string().uuid(),
  email: z.string().email(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  grind: z.string().optional(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = subscribeSchema.parse(body);

    // Fetch product
    const { data: product, error: productError } = await supabaseAdmin()
      .from("products")
      .select("*")
      .eq("id", parsed.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Find or create customer
    let { data: customer } = await supabaseAdmin()
      .from("customers")
      .select("id")
      .eq("email", parsed.email)
      .single();

    if (!customer) {
      const { data: newCustomer } = await supabaseAdmin()
        .from("customers")
        .insert({ email: parsed.email })
        .select("id")
        .single();
      customer = newCustomer;
    }

    if (!customer) {
      return NextResponse.json({ error: "Could not create customer" }, { status: 500 });
    }

    // Map frequency to Stripe interval
    const intervalMap: Record<string, { interval: "week" | "month"; interval_count: number }> = {
      weekly: { interval: "week", interval_count: 1 },
      biweekly: { interval: "week", interval_count: 2 },
      monthly: { interval: "month", interval_count: 1 },
    };
    const stripeInterval = intervalMap[parsed.frequency];

    const priceCents = (product as any).price_cents ?? 0;
    const productName = (product as any).name ?? "Coffee Club";
    const productDescription = `${parsed.frequency} subscription${parsed.grind ? ` · ${parsed.grind}` : ""}`;

    // Create Stripe price for subscription
    const stripePrice = await stripe().prices.create({
      currency: STORE_CONFIG.currency,
      unit_amount: priceCents,
      recurring: {
        interval: stripeInterval.interval,
        interval_count: stripeInterval.interval_count,
      },
      product_data: {
        name: `${productName} — ${productDescription}`,
      },
    } as any);

    // Create checkout session in subscription mode
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: parsed.email,
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      success_url: `${parsed.success_url}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: parsed.cancel_url,
      metadata: {
        kynda_product_id: parsed.product_id,
        kynda_customer_id: customer.id,
        frequency: parsed.frequency,
        grind: parsed.grind ?? "",
        source: "kynda-subscription",
      },
      subscription_data: {
        metadata: {
          kynda_product_id: parsed.product_id,
          kynda_customer_id: customer.id,
          frequency: parsed.frequency,
          grind: parsed.grind ?? "",
        },
      },
    } as any);

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Subscription checkout error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Subscription creation failed" }, { status: 500 });
  }
}

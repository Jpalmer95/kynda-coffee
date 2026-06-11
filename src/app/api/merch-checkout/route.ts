import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface MerchCheckoutItem {
  product_id: string;
  printful_product_id: number;
  printful_variant_id: number;
  name: string;
  quantity: number;
  price_cents: number;
  size?: string;
  color?: string;
  layers?: unknown[];
  view?: string;
  design_data?: Record<string, unknown>;
}

interface Recipient {
  name: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "merch-checkout", windowMs: 60_000, maxRequests: 5 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const { items, recipient, shipping_rate_cents } = body as {
      items: MerchCheckoutItem[];
      recipient?: Recipient; // OPTIONAL — Stripe collects the address (wallet-friendly)
      shipping_rate_cents: number;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "Missing items" }, { status: 400 });
    }

    // Validate email only when explicitly provided (legacy form path)
    if (recipient?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Step 1: Create a draft Printful order — ONLY when the caller supplied a
    // full address (legacy form path). The default wallet-first flow skips
    // this; the Stripe webhook creates the Printful order from the Stripe-
    // verified shipping address after payment succeeds.
    let printfulOrderId: number | null = null;

    const hasFullAddress =
      recipient?.line1 && recipient?.city && recipient?.state && recipient?.zip;

    if (process.env.PRINTFUL_API_KEY && hasFullAddress && recipient) {
      try {
        const pfRes = await fetch("https://api.printful.com/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          },
          body: JSON.stringify({
            confirm: false,
            recipient: {
              name: recipient.name,
              email: recipient.email,
              address1: recipient.line1,
              address2: recipient.line2 || "",
              city: recipient.city,
              state_code: recipient.state,
              zip: recipient.zip,
              country_code: recipient.country || "US",
            },
            items: items.map((item) => ({
              variant_id: item.printful_variant_id,
              quantity: item.quantity,
              retail_price: (item.price_cents / 100).toFixed(2),
            })),
          }),
        });

        if (pfRes.ok) {
          const pfData = await pfRes.json();
          printfulOrderId = pfData.result?.id || null;
        } else {
          console.error("[Merch Checkout] Printful draft failed:", await pfRes.text());
        }
      } catch (pfErr) {
        console.error("[Merch Checkout] Printful draft error:", pfErr);
      }
    }

    // Step 2: Calculate totals
    const subtotal_cents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
    const shipping_cents = shipping_rate_cents || 0;
    const total_cents = subtotal_cents + shipping_cents;

    // Step 3: Build Stripe line items
    type StripeLineItem = {
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    };

    const lineItems: StripeLineItem[] = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: `${item.size ? `${item.size} — ` : ""}${item.color || "Custom"} design`,
        },
        unit_amount: item.price_cents,
      },
      quantity: item.quantity,
    }));

    if (shipping_cents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping", description: "Printful merchandise shipping" },
          unit_amount: shipping_cents,
        },
        quantity: 1,
      });
    }

    // Step 4: Create Stripe Checkout Session
    const stripeClient = stripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kyndacoffee.com";

    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      // Only prefill email when the legacy form provided one — otherwise
      // Stripe (and the customer's wallet) collects it.
      ...(recipient?.email ? { customer_email: recipient.email } : {}),
      line_items: lineItems as any,
      success_url: `${appUrl}/shop/merch/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/studio`,
      // NOTE: do NOT pass payment_method_types — leaving it unset lets Stripe
      // automatically offer every method enabled in the Dashboard (Apple Pay,
      // Google Pay, Link, card, ...). Hardcoding ["card"] suppressed wallets.
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      phone_number_collection: { enabled: true },
      metadata: {
        source: "merch-checkout",
        printful_draft_id: printfulOrderId ? String(printfulOrderId) : "",
        order_type: "design_studio_merch",
        subtotal_cents: String(subtotal_cents),
        shipping_cents: String(shipping_cents),
        item_count: String(items.reduce((s, i) => s + i.quantity, 0)),
        item_names: items.map((i) => i.name).join(", ").slice(0, 480),
        // Compact variant list so the webhook can create the Printful order
        // post-payment (wallet-first flow has no draft yet).
        printful_items: JSON.stringify(
          items.map((i) => ({ v: i.printful_variant_id, q: i.quantity, p: i.price_cents }))
        ).slice(0, 480),
      },
    } as any);

    // Step 5: Store order record in Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const db = supabaseAdmin();

    let orderId: string | null = null;
    try {
      const { data: insertedOrder } = await db.from("orders").insert({
        customer_email: recipient?.email || "pending@stripe.checkout",
        customer_name: recipient?.name || "Pending (Stripe checkout)",
        order_type: "merch",
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price_cents: i.price_cents,
          size: i.size,
          color: i.color,
          design_data: i.design_data,
        })),
        subtotal_cents,
        shipping_cents,
        total_cents,
        status: "pending",
        payment_status: "pending",
        fulfillment_status: printfulOrderId ? "draft" : "pending",
        stripe_session_id: session.id,
        metadata: {
          printful_order_id: printfulOrderId,
          items,
          shipping_address: recipient,
        },
        ...(user ? { customer_id: user.id } : {}),
      } as any).select("id").single();

      if (insertedOrder) {
        orderId = insertedOrder.id;
        await stripeClient.checkout.sessions.update(session.id, {
          metadata: { ...session.metadata, kynda_order_id: orderId },
        });
      }
    } catch (orderErr) {
      console.error("[Merch Checkout] Order insert failed:", orderErr);
    }

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
      order_id: orderId,
      printful_order_id: printfulOrderId,
    });
  } catch (err: any) {
    console.error("[Merch Checkout]", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}

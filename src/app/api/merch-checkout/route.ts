import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe, STORE_CONFIG } from "@/lib/stripe/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { PRINTFUL_CATALOG, calculateRetailPrice } from "@/lib/printful/catalog";
import { calculatePrice } from "@/lib/pricing/engine";
import { getEffectivePricingProfile } from "@/lib/pricing/rules";

export const dynamic = "force-dynamic";

const PRINTFUL_TO_PRICING_PROFILE: Record<string, string> = {
  apparel: "merch-apparel",
  drinkware: "merch-mugs",
  accessories: "merch-accessories",
  "wall-art": "design-studio",
  "home-living": "design-studio",
};

interface MerchCheckoutItem {
  product_id: string;
  printful_product_id?: number;
  printful_variant_id: number;
  name?: string;
  quantity: number;
  price_cents?: number;
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
    const { items, recipient } = body as {
      items: MerchCheckoutItem[];
      recipient?: Recipient; // OPTIONAL — Stripe collects the address (wallet-friendly)
    };

    if (!Array.isArray(items) || items.length === 0 || items.length > 25) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    // Validate email only when explicitly provided (legacy form path)
    if (recipient?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Step 1: Resolve every item against PRINTFUL_CATALOG and compute
    // authoritative server-side pricing (never trust client price_cents or shipping).
    const verifiedItems: Array<{
      product_id: string;
      printful_product_id: number;
      printful_variant_id: number;
      name: string;
      quantity: number;
      price_cents: number;
      size?: string;
      color?: string;
      design_data?: Record<string, unknown>;
    }> = [];

    for (const raw of items) {
      const qty = Number(raw.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        return NextResponse.json({ error: "Each item quantity must be between 1 and 20." }, { status: 400 });
      }

      // Look up product by catalog id, printfulId, or variant id
      const catalogProduct =
        PRINTFUL_CATALOG.find((p) => p.id === raw.product_id) ||
        PRINTFUL_CATALOG.find((p) => raw.printful_product_id && p.printfulId === raw.printful_product_id) ||
        PRINTFUL_CATALOG.find((p) => p.variants.some((v) => v.id === raw.printful_variant_id));

      if (!catalogProduct) {
        return NextResponse.json(
          { error: "One or more merch items are no longer available. Please refresh your cart." },
          { status: 400 }
        );
      }

      const catalogVariant =
        catalogProduct.variants.find((v) => v.id === raw.printful_variant_id) ||
        catalogProduct.variants[0];

      if (!catalogVariant) {
        return NextResponse.json({ error: "Invalid product variant." }, { status: 400 });
      }

      // Compute authoritative retail price using pricing engine (fallback to catalog markup)
      const baseCost = catalogProduct.basePriceCents + (catalogVariant.additionalPriceCents || 0);
      let unitPriceCents = calculateRetailPrice(catalogProduct, catalogVariant);
      try {
        const profileKey = PRINTFUL_TO_PRICING_PROFILE[catalogProduct.category] ?? "design-studio";
        const profile = await getEffectivePricingProfile(profileKey);
        const quote = calculatePrice({
          costCents: baseCost,
          shippingCents: profile.shippingBufferCents,
          targetMarginPct: profile.targetMarginPct,
          minProfitCents: profile.minProfitCents,
          rounding: profile.rounding,
        });
        if (quote.retailCents > 0) {
          unitPriceCents = quote.retailCents;
        }
      } catch {
        // Fallback to deterministic catalog retail price
      }

      verifiedItems.push({
        product_id: catalogProduct.id,
        printful_product_id: catalogProduct.printfulId,
        printful_variant_id: catalogVariant.id,
        name: catalogProduct.name,
        quantity: qty,
        price_cents: unitPriceCents,
        size: catalogVariant.size || raw.size,
        color: catalogVariant.colorName || raw.color,
        design_data: raw.design_data,
      });
    }

    // Step 2: Calculate server-authoritative totals (Printful order is created
    // and confirmed ONLY inside the verified Stripe webhook after payment succeeds).
    const subtotal_cents = verifiedItems.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
    const shipping_cents =
      subtotal_cents >= STORE_CONFIG.free_shipping_threshold_cents
        ? 0
        : STORE_CONFIG.flat_shipping_cents;
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

    const lineItems: StripeLineItem[] = verifiedItems.map((item) => ({
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
        printful_draft_id: "",
        order_type: "design_studio_merch",
        subtotal_cents: String(subtotal_cents),
        shipping_cents: String(shipping_cents),
        item_count: String(verifiedItems.reduce((s, i) => s + i.quantity, 0)),
        item_names: verifiedItems.map((i) => i.name).join(", ").slice(0, 480),
        // Compact variant list so the webhook creates + confirms the Printful
        // order strictly post-payment from Stripe's verified shipping address.
        printful_items: JSON.stringify(
          verifiedItems.map((i) => ({ v: i.printful_variant_id, q: i.quantity, p: i.price_cents }))
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
        items: verifiedItems.map((i) => ({
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
        fulfillment_status: "pending",
        stripe_session_id: session.id,
        metadata: {
          printful_order_id: null,
          items: verifiedItems,
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
    });
  } catch (err: any) {
    console.error("[Merch Checkout]", err);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}

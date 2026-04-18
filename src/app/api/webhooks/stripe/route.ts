import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Force dynamic — don't try to build statically (needs env vars at runtime)
export const dynamic = "force-dynamic";

// Stripe webhook handler — creates orders, updates inventory, sends confirmations
export async function POST(req: NextRequest) {
  const stripeClient = stripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      // Get line items
      const lineItems = await stripeClient.checkout.sessions.listLineItems(
        session.id,
        { expand: ["data.price.product"] }
      );

      // Build order record
      const order = {
        email: session.customer_details?.email ?? session.customer_email!,
        status: "confirmed" as const,
        source: "website" as const,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        subtotal_cents: session.amount_subtotal ?? 0,
        tax_cents: (session.total_details?.amount_tax ?? 0),
        shipping_cents: (session.total_details?.amount_shipping ?? 0),
        total_cents: session.amount_total ?? 0,
        shipping_address: session.shipping_details?.address
          ? {
              line1: session.shipping_details.address.line1,
              line2: session.shipping_details.address.line2,
              city: session.shipping_details.address.city,
              state: session.shipping_details.address.state,
              postal_code: session.shipping_details.address.postal_code,
              country: session.shipping_details.address.country,
            }
          : undefined,
        items: lineItems.data.map((item) => ({
          product_name: (item.price?.product as any)?.name ?? "Unknown",
          quantity: item.quantity,
          unit_price_cents: item.price?.unit_amount ?? 0,
          total_cents: item.amount_total,
        })),
        order_number: `KYN-${Date.now()}`,
      };

      // Insert order into Supabase
      const { error } = await supabaseAdmin().from("orders").insert(order as any);
      if (error) console.error("Failed to create order:", error);

      // TODO: Send confirmation email via Resend
      // TODO: Trigger Printful fulfillment if merch items
      // TODO: Award loyalty points

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Handle Coffee Club subscription changes
      const subscription = event.data.object;
      const { error } = await supabaseAdmin()
        .from("subscriptions")
        .upsert({
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          customer_id: subscription.customer as string,
          // Map more fields as needed
        } as any);
      if (error) console.error("Subscription sync error:", error);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendShippingNotification } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

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

      const lineItems = await stripeClient.checkout.sessions.listLineItems(
        session.id,
        { expand: ["data.price.product"] }
      );

      const orderNumber = `KYN-${Date.now()}`;
      const email = session.customer_details?.email ?? session.customer_email!;

      // Map items with product IDs for inventory/loyalty
      const items = lineItems.data.map((item) => ({
        product_name: (item.price?.product as any)?.name ?? "Unknown",
        product_id: (item.price?.product as any)?.metadata?.product_id ?? null,
        quantity: item.quantity,
        unit_price_cents: item.price?.unit_amount ?? 0,
        total_cents: item.amount_total,
      }));

      const order = {
        email,
        status: "confirmed" as const,
        source: "website" as const,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        subtotal_cents: session.amount_subtotal ?? 0,
        tax_cents: session.total_details?.amount_tax ?? 0,
        shipping_cents: session.total_details?.amount_shipping ?? 0,
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
        items,
        order_number: orderNumber,
      };

      const { data: createdOrder, error } = await supabaseAdmin()
        .from("orders")
        .insert(order as any)
        .select()
        .single();

      if (error) {
        console.error("Failed to create order:", error);
      }

      // Update inventory for each item with a product_id
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabaseAdmin()
            .from("products")
            .select("id, inventory_count, track_inventory")
            .eq("id", item.product_id)
            .single();

          if (product && product.track_inventory && product.inventory_count != null) {
            const newCount = Math.max(0, product.inventory_count - (item.quantity ?? 1));
            await supabaseAdmin()
              .from("products")
              .update({ inventory_count: newCount })
              .eq("id", item.product_id);
          }
        }
      }

      // Award loyalty points: 1 point per $1 spent
      if (session.amount_total && session.amount_total > 0) {
        const pointsEarned = Math.floor(session.amount_total / 100);
        const { data: profile } = await supabaseAdmin()
          .from("profiles")
          .select("id, loyalty_points")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          await supabaseAdmin()
            .from("profiles")
            .update({ loyalty_points: (profile.loyalty_points ?? 0) + pointsEarned })
            .eq("id", profile.id);

          // Record transaction
          await supabaseAdmin().from("loyalty_transactions").insert({
            profile_id: profile.id,
            order_id: createdOrder?.id ?? null,
            points: pointsEarned,
            type: "earned",
            description: `Purchase ${orderNumber}`,
          } as any);
        }
      }

      // Send confirmation email (map items to expected shape)
      await sendOrderConfirmation({
        to: email,
        orderNumber,
        items: items.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity ?? 1,
          total_cents: i.total_cents,
        })),
        total: session.amount_total ?? 0,
        shippingAddress: order.shipping_address,
      });

      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent as string;

      // Update order status
      await supabaseAdmin()
        .from("orders")
        .update({ status: "refunded" })
        .eq("stripe_payment_intent_id", paymentIntentId);

      // Reverse loyalty points
      const { data: order } = await supabaseAdmin()
        .from("orders")
        .select("id, email, total_cents")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (order?.email && order.total_cents) {
        const { data: profile } = await supabaseAdmin()
          .from("profiles")
          .select("id, loyalty_points")
          .eq("email", order.email)
          .maybeSingle();

        if (profile) {
          const pointsToDeduct = Math.floor(order.total_cents / 100);
          await supabaseAdmin()
            .from("profiles")
            .update({
              loyalty_points: Math.max(0, (profile.loyalty_points ?? 0) - pointsToDeduct),
            })
            .eq("id", profile.id);

          await supabaseAdmin().from("loyalty_transactions").insert({
            profile_id: profile.id,
            order_id: order.id,
            points: -pointsToDeduct,
            type: "refunded",
            description: "Order refunded",
          } as any);
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const { error } = await supabaseAdmin()
        .from("subscriptions")
        .upsert({
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          customer_id: subscription.customer as string,
        } as any);
      if (error) console.error("Subscription sync error:", error);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

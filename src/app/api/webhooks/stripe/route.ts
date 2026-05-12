import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Idempotency: prevent duplicate processing of the same event
    const { data: existingWebhook } = await supabaseAdmin()
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingWebhook) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    // Record the event to lock it
    await supabaseAdmin()
      .from("webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      })
      .single();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;

      // Fetch the order we stored earlier
      const { data: existingOrder } = await supabaseAdmin()
        .from("orders")
        .select("*")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingOrder) {
        // Mark order as paid
        await supabaseAdmin()
          .from("orders")
          .update({
            status: "confirmed",
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOrder.id);

        // If this was a Design Studio / Printful order, confirm it
        if (existingOrder.items && existingOrder.items.some((i: any) => i.source === "design_studio" || i.printful_variant_id)) {
          if (existingOrder.printful_order_id) {
            try {
              const { confirmOrder } = await import("@/lib/printful/client");
              await confirmOrder(Number(existingOrder.printful_order_id));

              await supabaseAdmin()
                .from("orders")
                .update({
                  status: "processing",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingOrder.id);
            } catch (printfulErr) {
              console.error("Printful confirm failed:", printfulErr);
              // Don't fail the webhook — Printful can be retried manually
            }
          }
        }

        // Send order confirmation email
        if (customerEmail) {
          try {
            const { sendEmail } = await import("@/lib/email/service");
            await sendEmail({
              to: customerEmail,
              template: "order-confirmation",
              data: {
                orderNumber: existingOrder.order_number,
                email: customerEmail,
                total: existingOrder.total_cents,
                items: existingOrder.items,
              },
            });
          } catch (emailErr) {
            console.error("Order confirmation email failed:", emailErr);
            // Don't fail the webhook — email can be resent manually
          }
        }
      }
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;

      if (subscriptionId) {
        const { data: subscription } = await supabaseAdmin()
          .from("subscriptions")
          .select("*")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (subscription && event.type === "invoice.payment_failed") {
          await supabaseAdmin()
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

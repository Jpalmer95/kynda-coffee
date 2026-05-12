import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { confirmOrder } from "@/lib/printful/client";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;

      // Fetch the order items we stored earlier (or reconstruct via metadata)
      const { data: existingOrder } = await supabaseAdmin()
        .from("orders")
        .select("*")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      // If this was a Design Studio / Printful order, confirm it
      if (existingOrder && existingOrder.items?.some((i: any) => i.source === "design_studio" || i.printful_variant_id)) {
        const printfulDraftId = existingOrder.printful_order_id; // we store this during cart checkout

        if (printfulDraftId) {
          await confirmOrder(Number(printfulDraftId));

          await supabaseAdmin()
            .from("orders")
            .update({
              status: "processing",
              printful_order_id: printfulDraftId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingOrder.id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildStripeLineItemsForOrder,
  buildStripeOrderMetadata,
  canCreateStripePaymentForOrder,
  stripeCancelUrl,
  stripeSuccessUrl,
  type StripePayableOrder,
} from "@/lib/orders/stripe-payment";

export const dynamic = "force-dynamic";

const ORDER_SELECT = "id, order_number, email, source, order_channel, payment_status, total_cents, items, stripe_checkout_session_id, payment_metadata";

function requestOrigin(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl;
  return new URL(req.url).origin;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const payableOrder = order as StripePayableOrder;
    const canPay = canCreateStripePaymentForOrder(payableOrder);
    if (!canPay.ok) {
      return NextResponse.json({ error: canPay.error }, { status: 400 });
    }

    const origin = requestOrigin(req);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      line_items: buildStripeLineItemsForOrder(payableOrder),
      success_url: stripeSuccessUrl(origin, payableOrder),
      cancel_url: stripeCancelUrl(origin, payableOrder),
      metadata: buildStripeOrderMetadata(payableOrder),
    });

    const metadata = {
      ...((order.payment_metadata as Record<string, unknown> | null) ?? {}),
      stripe_checkout_session_created_at: new Date().toISOString(),
    };

    await supabaseAdmin()
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        payment_method: "stripe",
        payment_metadata: metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("QR Stripe payment creation failed", error);
    return NextResponse.json({ error: "Failed to create payment session." }, { status: 500 });
  }
}

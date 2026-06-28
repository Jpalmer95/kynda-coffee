import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

    // ── Auth: verify the caller is authorized to pay this order ──────
    // Accept any of:
    //   1. CRON_SECRET / AGENT_API_KEY bearer (server-side flows)
    //   2. Authenticated session whose email matches the order
    //   3. Unauthenticated QR/table/pickup orders (the order was just
    //      created by this client; the Stripe session itself is harmless
    //      without payment completion, and the order must be unpaid)
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const cronSecret = process.env.CRON_SECRET;
    const agentKey = process.env.AGENT_API_KEY;
    const isServerAuth =
      (cronSecret && bearer === cronSecret) ||
      (agentKey && bearer === agentKey);

    if (!isServerAuth) {
      // Check if the user is authenticated (cookie-based session)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && order.email !== user.email) {
        // Authenticated user trying to pay someone else's order
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // If no authenticated user, only allow for QR/table/pickup orders
      // (these are created without login). Online shop orders require auth.
      if (!user && order.source === "website") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payableOrder = order as StripePayableOrder;
    const canPay = canCreateStripePaymentForOrder(payableOrder);
    if (!canPay.ok) {
      return NextResponse.json({ error: canPay.error }, { status: 400 });
    }

    const origin = requestOrigin(req);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: order.email && !order.email.startsWith("pending@") ? order.email : undefined,
      line_items: buildStripeLineItemsForOrder(payableOrder),
      success_url: stripeSuccessUrl(origin, payableOrder),
      cancel_url: stripeCancelUrl(origin, payableOrder),
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      metadata: buildStripeOrderMetadata(payableOrder),
    } as any);

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

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildPaymentUpdate, type PaymentMethod, type PaymentOrderLike, type PaymentStatus } from "@/lib/orders/payment";

export const dynamic = "force-dynamic";

const ORDER_SELECT = "id, order_number, email, total_cents, payment_status, payment_method, payment_preference, payment_metadata, paid_at, stripe_payment_intent_id, stripe_checkout_session_id, square_order_id, fulfillment_metadata, created_at, updated_at";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const nextStatus = body.payment_status as PaymentStatus | undefined;
    const method = body.payment_method as PaymentMethod | undefined;
    const note = typeof body.note === "string" ? body.note : undefined;

    if (!nextStatus) {
      return NextResponse.json({ error: "payment_status is required." }, { status: 400 });
    }

    const { data: current, error: fetchError } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const update = buildPaymentUpdate({
      order: current as PaymentOrderLike,
      nextStatus,
      method,
      note,
      actor: user.email ?? user.id,
    });

    if (!update.ok) {
      return NextResponse.json({ error: update.error }, { status: 400 });
    }

    const { data: order, error: updateError } = await supabaseAdmin()
      .from("orders")
      .update({
        ...update.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (updateError || !order) {
      console.error("Payment update error", updateError);
      return NextResponse.json({ error: "Failed to update payment." }, { status: 500 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Payment update exception", error);
    return NextResponse.json({ error: "Failed to update payment." }, { status: 500 });
  }
}

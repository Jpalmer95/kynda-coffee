import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertKdsTransition, sortKdsOrders, type KdsOrderLike } from "@/lib/orders/kds";
import { sendSms } from "@/lib/sms/twilio";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

const ORDER_SELECT = "id, order_number, email, status, source, items, subtotal_cents, tax_cents, shipping_cents, total_cents, notes, fulfillment_metadata, payment_preference, order_channel, payment_status, payment_method, paid_at, payment_metadata, created_at, updated_at";

// Any team member (barista+) can run the KDS — not just the admin allowlist.
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["pending", "confirmed", "processing"])
      .or("source.eq.qr,order_channel.in.(qr,pickup,table,lobby,parking,delivery,pos,agent)")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("KDS fetch error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: sortKdsOrders((data ?? []) as KdsOrderLike[]) });
  } catch (error) {
    console.error("KDS error", error);
    return NextResponse.json({ error: "Failed to fetch KDS orders" }, { status: 500 });
  }
}

/** "Your order is ready" customer notification, fired on the KDS Ready bump. */
function readySmsBody(orderNumber: string, mode?: string): string {
  if (mode === "parking") {
    return `Kynda Coffee: Order ${orderNumber} is ready — we're bringing it out to your vehicle now!`;
  }
  if (mode === "table") {
    return `Kynda Coffee: Order ${orderNumber} is ready — we're bringing it to your table!`;
  }
  return `Kynda Coffee: Order ${orderNumber} is ready for pickup at the counter. See you in a sec!`;
}

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = team.user;

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const nextStatus = body.status as OrderStatus | undefined;

    if (!id || !nextStatus) {
      return NextResponse.json({ error: "Order id and status are required." }, { status: 400 });
    }

    const { data: current, error: fetchError } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const transition = assertKdsTransition(current.status as OrderStatus, nextStatus);
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const metadata = {
      ...((current.fulfillment_metadata as Record<string, unknown> | null) ?? {}),
      kds_last_status: nextStatus,
      kds_last_status_at: new Date().toISOString(),
      kds_last_status_by: user.email ?? user.id,
    };

    const { data: order, error: updateError } = await supabaseAdmin()
      .from("orders")
      .update({
        status: nextStatus,
        fulfillment_metadata: metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (updateError || !order) {
      console.error("KDS update error", updateError);
      return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
    }

    // Ready bump → best-effort customer SMS (never blocks the KDS response).
    if (nextStatus === "ready") {
      const fm = current.fulfillment_metadata as
        | { customer_phone?: string; mode?: string }
        | null;
      const phone = fm?.customer_phone?.trim();
      if (phone) {
        sendSms({
          to: phone,
          body: readySmsBody(current.order_number as string, fm?.mode),
        }).catch((e) => console.error("Ready SMS failed:", e));
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("KDS update exception", error);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}

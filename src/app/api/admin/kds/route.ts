import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertKdsTransition, sortKdsOrders, type KdsOrderLike } from "@/lib/orders/kds";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

const ORDER_SELECT = "id, order_number, email, status, source, items, subtotal_cents, tax_cents, shipping_cents, total_cents, notes, fulfillment_metadata, payment_preference, order_channel, created_at, updated_at";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["pending", "confirmed", "processing"])
      .or("source.eq.qr,order_channel.in.(qr,pickup,table,lobby,parking)")
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

export async function PATCH(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    return NextResponse.json({ order });
  } catch (error) {
    console.error("KDS update exception", error);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getPosCatalog } from "@/lib/pos/catalog";
import { buildQrOrderDraft, type QrOrderDraft, type QrOrderRequest } from "@/lib/orders/qr-order";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function orderChannelForMode(mode: string) {
  if (mode === "table" || mode === "parking" || mode === "lobby") return mode;
  return "pickup";
}

function serializeOrder(draft: QrOrderDraft) {
  return {
    order_number: draft.order_number,
    customer_id: draft.customer_id,
    email: draft.email,
    status: draft.status,
    source: draft.source,
    items: draft.items,
    subtotal_cents: draft.subtotal_cents,
    tax_cents: draft.tax_cents,
    shipping_cents: draft.shipping_cents,
    total_cents: draft.total_cents,
    shipping_address: draft.shipping_address,
    notes: draft.notes,
    fulfillment_metadata: draft.fulfillment_metadata,
    payment_preference: draft.fulfillment_metadata.payment_preference,
    order_channel: orderChannelForMode(draft.fulfillment_metadata.mode),
    submitted_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QrOrderRequest;
    const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true, limit: 500 });
    const draftResult = buildQrOrderDraft(body, catalog.items);

    if (!draftResult.ok) {
      return NextResponse.json({ error: draftResult.error }, { status: 400 });
    }

    const insert = serializeOrder(draftResult.value);
    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .insert(insert as any)
      .select("id, order_number, status, source, total_cents, items, fulfillment_metadata, payment_preference, order_channel, created_at")
      .single();

    if (error) {
      console.error("QR order insert failed", error);
      return NextResponse.json({ error: "Failed to submit order." }, { status: 500 });
    }

    return NextResponse.json({
      order,
      message: "Order submitted. Please pay at the counter when you arrive unless a team member instructs otherwise.",
    });
  } catch (error) {
    console.error("Order submit error", error);
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }
}

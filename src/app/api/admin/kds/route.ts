import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertKdsTransition, sortKdsOrders, startOfTodayInTz, ACTIVE_KDS_STATUSES, type KdsOrderLike } from "@/lib/orders/kds";
import { sendSms } from "@/lib/sms/twilio";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

const ORDER_SELECT = "id, order_number, email, status, source, items, subtotal_cents, tax_cents, shipping_cents, total_cents, notes, fulfillment_metadata, payment_preference, order_channel, payment_status, payment_method, paid_at, payment_metadata, created_at, updated_at";

// Any team member (barista+) can run the KDS — not just the admin allowlist.
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = supabaseAdmin();
    // Broadened channel filter: catches every known order source so nothing
    // falls through if order_channel happens to be NULL. The OR means an
    // order matches if EITHER its source OR its order_channel is recognised.
    //   Sources: pos, qr, website, square-pos, agent, kynda-qr-order, kynda-website
    //   Channels: qr, pickup, table, lobby, parking, delivery, pos, agent, web
    // 'pos' is included as a legacy safety net — syncRecentOrders originally
    // wrote source='pos' (now corrected to 'square-pos') and 300 historical
    // rows still carry the old value.
    const channelFilter =
      "source.in.(pos,qr,website,square-pos,agent,kynda-qr-order,kynda-website),order_channel.in.(qr,pickup,table,lobby,parking,delivery,pos,agent,web)";

    // Auto-cleanup: mark any active order older than 2 days as complete.
    // This prevents stale tickets from accumulating on the board when staff
    // forget to bump them. Runs on every KDS load (non-blocking).
    const staleCutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    void supabase
      .from("orders")
      .update({ status: "complete", updated_at: new Date().toISOString() })
      .in("status", [...ACTIVE_KDS_STATUSES])
      .or(channelFilter)
      .lt("created_at", staleCutoff)
      .then((r) => {
        if (r.data && (r.data as unknown[]).length > 0) {
          console.log(`[KDS] Auto-completed ${(r.data as unknown[]).length} stale orders older than 2 days`);
        }
      });

    // Date scope: default = today only (shop-local midnight). ?scope=all
    // shows older stale tickets too (e.g. something left over from yesterday).
    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "today";
    let activeQuery = supabase
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", [...ACTIVE_KDS_STATUSES])
      .or(channelFilter);
    if (scope === "today") {
      activeQuery = activeQuery.gte("created_at", startOfTodayInTz().toISOString());
    }

    const [active, completed] = await Promise.all([
      activeQuery.order("created_at", { ascending: true }).limit(100),
      // Recently Completed rail: finished tickets from the last 48 hours so
      // an accidental "Picked Up" tap is recoverable and staff can review
      // 1-2 days' worth of fulfilled orders. Ordered newest-first so the
      // most recently completed ticket is at the top.
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .in("status", ["complete", "fulfilled", "delivered"])
        .or(channelFilter)
        .gte("updated_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order("updated_at", { ascending: false })
        .limit(200),
    ]);

    if (active.error) {
      console.error("KDS fetch error", active.error);
      return NextResponse.json({ error: active.error.message }, { status: 500 });
    }
    if (completed.error) {
      // The rail is a convenience — never block the live board on it.
      console.error("KDS completed fetch error", completed.error);
    }

    return NextResponse.json({
      orders: sortKdsOrders((active.data ?? []) as KdsOrderLike[]),
      completed: completed.data ?? [],
    });
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
      // Surface the real reason (e.g. a CHECK constraint) instead of an
      // opaque 500 — staff/owner can actually report something actionable.
      const detail = updateError?.message ? ` (${updateError.message})` : "";
      return NextResponse.json({ error: `Failed to update order.${detail}` }, { status: 500 });
    }

    // Ready bump → best-effort customer SMS (never blocks the KDS response).
    // Only on the genuine processing→ready bump — bringing a ticket BACK from
    // Recently Completed (complete→ready) must not re-text the customer.
    if (nextStatus === "ready" && current.status === "processing") {
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

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/orders/[id]?email=... — agent-friendly order status.
 *
 * Knowledge-based auth: the caller must present the email (or phone) the
 * order was placed with. That keeps strangers from enumerating orders while
 * letting the agent that placed an order (or the customer) track it without
 * accounts or API keys.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  const limit = rateLimit(ip, { identifier: "agent-order-status", windowMs: 60_000, maxRequests: 30 });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const { id } = await params;
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const phone = (url.searchParams.get("phone") ?? "").trim();

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Provide the email or phone the order was placed with (?email= or ?phone=)." },
      { status: 400 }
    );
  }

  try {
    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .select(
        "id, order_number, email, status, total_cents, payment_status, items, fulfillment_metadata, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const fm = (order.fulfillment_metadata ?? {}) as { customer_phone?: string; mode?: string };
    const emailMatches = email && order.email?.toLowerCase() === email;
    const phoneMatches =
      phone && fm.customer_phone && fm.customer_phone.replace(/\D/g, "") === phone.replace(/\D/g, "");

    if (!emailMatches && !phoneMatches) {
      // Same response as not-found: don't confirm the order exists.
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const STATUS_MESSAGES: Record<string, string> = {
      pending: "Order received — waiting for the team to accept it.",
      confirmed: "Order accepted — in the queue.",
      processing: "Being prepared right now.",
      ready: "Ready for pickup!",
      complete: "Picked up. Enjoy!",
      fulfilled: "Picked up. Enjoy!",
      delivered: "Delivered.",
      shipped: "Shipped.",
      cancelled: "This order was cancelled.",
      refunded: "This order was refunded.",
    };

    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_message: STATUS_MESSAGES[order.status] ?? order.status,
        payment_status: order.payment_status,
        total_cents: order.total_cents,
        mode: fm.mode,
        items: ((order.items ?? []) as Array<Record<string, unknown>>).map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          total_cents: i.total_cents,
        })),
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
    });
  } catch (err) {
    console.error("[agent/orders/:id] error", err);
    return NextResponse.json({ error: "Failed to fetch order." }, { status: 500 });
  }
}

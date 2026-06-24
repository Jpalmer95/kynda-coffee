import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startOfTodayInTz, KDS_TIMEZONE } from "@/lib/orders/kds";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/history
 *
 * Query params:
 *   range  = "today" | "7d" | "30d" | "custom"  (default: today)
 *   from   = ISO date string (when range=custom, inclusive)
 *   to     = ISO date string (when range=custom, inclusive end-of-day)
 *   status = comma-separated status filter, e.g. "complete,fulfilled"
 *   source = comma-separated source filter, e.g. "website,square-pos,qr"
 *   limit  = max rows (default 200, cap 1000)
 *
 * Returns all orders in the range (no active-board filter) so the owner can
 * review the full day's fulfillment history — including paid, POS, delivery,
 * and marketplace orders.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "today";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const statusParam = url.searchParams.get("status");
  const sourceParam = url.searchParams.get("source");
  const limitParam = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1000);

  // Resolve the date window (in café-local time, same as the KDS).
  const now = new Date();
  let fromISO: string;
  let toISO: string;

  switch (range) {
    case "7d":
      fromISO = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      toISO = now.toISOString();
      break;
    case "30d":
      fromISO = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      toISO = now.toISOString();
      break;
    case "custom": {
      if (!fromParam) {
        return NextResponse.json({ error: "Custom range requires a 'from' date." }, { status: 400 });
      }
      const from = new Date(fromParam);
      if (Number.isNaN(from.getTime())) {
        return NextResponse.json({ error: "Invalid 'from' date." }, { status: 400 });
      }
      fromISO = from.toISOString();
      // Default "to" = end of today if not provided.
      const to = toParam ? new Date(toParam) : startOfTodayInTz(KDS_TIMEZONE, now);
      if (Number.isNaN(to.getTime())) {
        return NextResponse.json({ error: "Invalid 'to' date." }, { status: 400 });
      }
      // Include the entire "to" day (set to end of that day).
      to.setHours(23, 59, 59, 999);
      toISO = to.toISOString();
      break;
    }
    case "today":
    default:
      fromISO = startOfTodayInTz(KDS_TIMEZONE, now).toISOString();
      toISO = now.toISOString();
      break;
  }

  const ORDER_SELECT =
    "id, order_number, email, status, source, items, subtotal_cents, tax_cents, shipping_cents, total_cents, notes, fulfillment_metadata, payment_preference, order_channel, payment_status, payment_method, paid_at, payment_metadata, created_at, updated_at";

  let query = supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .order("created_at", { ascending: false })
    .limit(limitParam);

  if (statusParam) {
    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }
  }
  if (sourceParam) {
    const sources = sourceParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (sources.length > 0) {
      query = query.in("source", sources);
    }
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error("Order history fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: orders ?? [],
    range,
    from: fromISO,
    to: toISO,
    count: orders?.length ?? 0,
  });
}

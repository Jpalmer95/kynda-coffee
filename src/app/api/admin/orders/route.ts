import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/suggest
 * Body: { vendor?: "HEB"|"Amazon"|"All" (default "All") }
 *
 * Generates draft purchase orders grouped by vendor from ingredient_pars
 * where order_qty > 0. Saves as draft purchase_orders.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const vendorFilter = body.vendor === "HEB" || body.vendor === "Amazon" || body.vendor === "Other"
      ? body.vendor
      : null;

    // Fetch all active pars
    let parsQuery = supabaseAdmin()
      .from("ingredient_pars")
      .select("*")
      .eq("is_active", true)
      .order("vendor")
      .order("ingredient_name");

    if (vendorFilter) parsQuery = parsQuery.eq("vendor", vendorFilter);
    const { data: pars, error: parsErr } = await parsQuery;
    if (parsErr) throw parsErr;

    // Fetch latest par counts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentCounts } = await supabaseAdmin()
      .from("par_counts")
      .select("item_name, counted_qty, counted_at")
      .gte("counted_at", sevenDaysAgo.toISOString())
      .order("counted_at", { ascending: false });

    const latestCountMap: Record<string, number> = {};
    for (const c of recentCounts ?? []) {
      if (!latestCountMap[c.item_name]) latestCountMap[c.item_name] = Number(c.counted_qty);
    }

    // Also fetch MM stock
    const { data: mmStock } = await supabaseAdmin()
      .from("menumetrics_stock")
      .select("name, on_hand");
    const mmMap: Record<string, number> = {};
    for (const s of mmStock ?? []) {
      mmMap[s.name?.toLowerCase() ?? ""] = Number(s.on_hand);
    }

    // Group items by vendor, only those needing order
    const byVendor: Record<string, any[]> = {};
    for (const p of pars ?? []) {
      const onHand = latestCountMap[p.ingredient_name] ??
        mmMap[p.ingredient_name?.toLowerCase()] ??
        null;
      const orderQty = onHand != null ? Math.max(0, Number(p.par_level) - onHand) : null;
      if (orderQty != null && orderQty > 0) {
        const v = p.vendor;
        if (!byVendor[v]) byVendor[v] = [];
        byVendor[v].push({
          name: p.ingredient_name,
          qty: orderQty,
          unit: p.unit,
          par: Number(p.par_level),
          on_hand: onHand,
        });
      }
    }

    // Create draft purchase orders
    const created: any[] = [];
    for (const [vendor, items] of Object.entries(byVendor)) {
      const { data, error } = await supabaseAdmin()
        .from("purchase_orders")
        .insert({
          vendor,
          status: "draft",
          items,
          created_by: team.user.id,
        })
        .select()
        .single();
      if (!error && data) created.push(data);
    }

    return NextResponse.json({
      orders: created,
      summary: {
        vendors: Object.keys(byVendor),
        total_items: Object.values(byVendor).reduce((sum, items) => sum + items.length, 0),
      },
    });
  } catch (error) {
    console.error("Order suggest error", error);
    return NextResponse.json(
      { error: "Failed to generate orders", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders — list purchase orders
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("purchase_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

/**
 * PATCH /api/admin/orders — update order status
 * Body: { id, status, notes? }
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) payload.status = body.status;
    if (body.notes !== undefined) payload.notes = body.notes;
    if (body.status === "approved") {
      payload.approved_by = team.user.id;
      payload.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin()
      .from("purchase_orders")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

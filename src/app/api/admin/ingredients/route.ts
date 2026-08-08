import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ingredients
 *   Returns: ingredient_pars joined with latest par_counts (on_hand)
 *   + MenuMetrics stock data where available.
 *   Computed order_qty = par_level - on_hand (min 0).
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Fetch all active pars
    const { data: pars, error: parsErr } = await supabaseAdmin()
      .from("ingredient_pars")
      .select("*")
      .eq("is_active", true)
      .order("vendor")
      .order("ingredient_name");

    if (parsErr) throw parsErr;

    // Fetch latest par_count per ingredient (by name) — last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentCounts } = await supabaseAdmin()
      .from("par_counts")
      .select("item_name, counted_qty, counted_at")
      .gte("counted_at", sevenDaysAgo.toISOString())
      .order("counted_at", { ascending: false });

    // Build latest count per item
    const latestCountMap: Record<string, number> = {};
    for (const c of recentCounts ?? []) {
      if (!latestCountMap[c.item_name]) latestCountMap[c.item_name] = Number(c.counted_qty);
    }

    // Also fetch MenuMetrics stock (if synced)
    const { data: mmStock } = await supabaseAdmin()
      .from("menumetrics_stock")
      .select("name, on_hand, unit, is_low")
      .order("name");

    const mmMap: Record<string, any> = {};
    for (const s of mmStock ?? []) {
      mmMap[s.name?.toLowerCase() ?? ""] = s;
    }

    // Combine: for each par, find on_hand (from latest count or MM stock)
    const items = (pars ?? []).map((p: any) => {
      const onHand = latestCountMap[p.ingredient_name] ??
        mmMap[p.ingredient_name?.toLowerCase()]?.on_hand ??
        null;
      const orderQty = onHand != null ? Math.max(0, Number(p.par_level) - onHand) : null;
      return {
        id: p.id,
        ingredient_name: p.ingredient_name,
        area: p.area,
        unit: p.unit,
        par_level: Number(p.par_level),
        vendor: p.vendor,
        cadence: p.cadence,
        on_hand: onHand,
        order_qty: orderQty,
        needs_order: orderQty != null && orderQty > 0,
        notes: p.notes,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Ingredients GET error", error);
    return NextResponse.json(
      { error: "Failed to load ingredients", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ingredients
 * Body: { ingredient_name, par_level, vendor, cadence, unit?, area?, notes? }
 * Create or upsert a par target.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = (body.ingredient_name ?? "").trim();
    if (!name) return NextResponse.json({ error: "ingredient_name is required" }, { status: 400 });
    const par = Number(body.par_level);
    if (!Number.isFinite(par) || par < 0) {
      return NextResponse.json({ error: "par_level must be a non-negative number" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("ingredient_pars")
      .upsert({
        ingredient_name: name,
        par_level: par,
        vendor: body.vendor ?? "HEB",
        cadence: body.cadence ?? "biweekly",
        unit: body.unit ?? "each",
        area: body.area ?? "general",
        notes: body.notes ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "ingredient_name" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ par: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save par" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/ingredients
 * Body: { id, par_level?, vendor?, cadence?, is_active?, notes? }
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of ["par_level", "vendor", "cadence", "is_active", "notes", "unit", "area"]) {
      if (f in body) payload[f] = body[f];
    }

    const { data, error } = await supabaseAdmin()
      .from("ingredient_pars")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ par: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update par" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/ingredients?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("ingredient_pars")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

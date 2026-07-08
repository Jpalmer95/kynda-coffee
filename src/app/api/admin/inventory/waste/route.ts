import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inventory/waste
 *   - ?from=YYYY-MM-DD&to=YYYY-MM-DD → filter by date range
 *   - ?reason=broken → filter by reason
 *   - (no params) → last 100 entries
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const reason = searchParams.get("reason");

  let query = supabaseAdmin()
    .from("waste_log")
    .select("*")
    .order("waste_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (from) query = query.gte("waste_date", from);
  if (to) query = query.lte("waste_date", to);
  if (reason) query = query.eq("reason", reason);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}

/**
 * POST /api/admin/inventory/waste
 * Create a waste log entry.
 * Body: { name, quantity, unit, unit_cost_cents, reason, notes?, shift?, pos_item_id?, pos_variation_id?, product_id?, ingredient_id? }
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const quantity = Number(body.quantity ?? 1);
    const unitCostCents = Math.max(0, Math.round(Number(body.unit_cost_cents ?? 0)));
    const totalCostCents = Math.round(quantity * unitCostCents);

    const payload = {
      logged_by: team.user.id,
      name,
      quantity,
      unit: body.unit ?? "each",
      unit_cost_cents: unitCostCents,
      total_cost_cents: totalCostCents,
      reason: body.reason ?? "other",
      notes: body.notes ?? null,
      shift: body.shift ?? null,
      pos_item_id: body.pos_item_id ?? null,
      pos_variation_id: body.pos_variation_id ?? null,
      product_id: body.product_id ?? null,
      ingredient_id: body.ingredient_id ?? null,
    };

    const { data, error } = await supabaseAdmin()
      .from("waste_log")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entry: data });
  } catch (error) {
    console.error("Waste log POST error", error);
    return NextResponse.json(
      { error: "Failed to create waste entry", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/inventory/waste?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("waste_log")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

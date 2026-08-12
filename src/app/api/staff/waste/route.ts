import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/staff/waste
 * Log a waste entry
 */
export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = team.user;

    const body = await req.json();
    const { product_id, quantity, unit, reason, cost_cents, notes } = body;

    if (!product_id || !quantity || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Resolve the item name + real cost. Prefer ingredient_pars (HEB exact
    // names + unit_cost_cents); fall back to products (menu items).
    let product_name = "";
    let unit_cost_cents = Number(cost_cents) || 0;
    let ingredient_id: string | null = null;
    let product_id_fk: string | null = null;

    try {
      const { data: ing } = await admin
        .from("ingredient_pars")
        .select("ingredient_name, unit_cost_cents")
        .eq("id", product_id)
        .single();
      if (ing) {
        product_name = ing.ingredient_name;
        ingredient_id = product_id;
        product_id_fk = null;
        if (!unit_cost_cents) unit_cost_cents = Number(ing.unit_cost_cents) || 0;
      }
    } catch { /* not an ingredient */ }

    if (!product_name) {
      try {
        const { data: product } = await admin
          .from("products")
          .select("name")
          .eq("id", product_id)
          .single();
        product_name = product?.name || "";
        product_id_fk = product ? product_id : null;
        ingredient_id = null;
      } catch {
        product_name = "Unknown product";
      }
    }

    // Effective cost = qty × unit cost (real HEB price when available)
    const effectiveCostCents = unit_cost_cents > 0
      ? Math.round(parseFloat(quantity) * unit_cost_cents)
      : unit_cost_cents;

    const { data: entry, error } = await admin
      .from("waste_entries")
      .insert({
        product_id: product_id_fk,
        product_name,
        quantity: parseFloat(quantity),
        unit: unit || "each",
        reason,
        cost_cents: effectiveCostCents,
        unit_cost_cents,
        ingredient_id,
        notes,
        reported_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
        return NextResponse.json(
          { error: "Waste log table not set up yet. Ask an admin to run the migration." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/staff/waste
 * List waste entries
 */
export async function GET(req: NextRequest) {
  try {
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin()
      .from("waste_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e.message });
  }
}

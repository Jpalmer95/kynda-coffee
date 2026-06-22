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

    // Get product name
    let product_name = "";
    try {
      const { data: product } = await admin
        .from("products")
        .select("name")
        .eq("id", product_id)
        .single();
      product_name = product?.name || "";
    } catch {
      product_name = "Unknown product";
    }

    const { data: entry, error } = await admin
      .from("waste_entries")
      .insert({
        product_id,
        product_name,
        quantity: parseFloat(quantity),
        unit: unit || "each",
        reason,
        cost_cents: cost_cents || 0,
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

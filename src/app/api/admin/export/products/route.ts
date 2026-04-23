import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: products } = await supabaseAdmin()
      .from("products")
      .select("*");

    const rows = (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      price: (p.price_cents / 100).toFixed(2),
      cost: p.cost_cents ? (p.cost_cents / 100).toFixed(2) : "",
      inventory: p.track_inventory ? p.inventory_count : "N/A",
      featured: p.featured ? "Yes" : "No",
      created: p.created_at,
    }));

    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

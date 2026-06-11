import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/studio-designs — public list of active admin-curated designs.
 *
 * Query params:
 *   trending=1     only trending designs
 *   shop=1         only designs flagged show_on_shop
 *   style=<style>  filter by style category
 *
 * Used by the Design Studio "Designs" tab and the Shop merch page.
 * Falls back gracefully (empty list) if the table doesn't exist yet.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = supabaseAdmin();

    let query = db
      .from("studio_designs")
      .select("id,name,description,image_url,style,product_id,trending,seasonal,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(60);

    if (searchParams.get("trending") === "1") query = query.eq("trending", true);
    if (searchParams.get("shop") === "1") query = query.eq("show_on_shop", true);
    const style = searchParams.get("style");
    if (style && style !== "all") query = query.eq("style", style);

    const { data, error } = await query;
    if (error) {
      // Table may not exist yet — return empty so the UI falls back to built-ins
      return NextResponse.json({ designs: [] });
    }

    return NextResponse.json(
      { designs: data ?? [] },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ designs: [] });
  }
}

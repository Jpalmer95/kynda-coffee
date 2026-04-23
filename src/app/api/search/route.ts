import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Search products
    const { data: products, error: productError } = await supabaseAdmin()
      .from("products")
      .select("id, name, slug, description, category, price_cents, images, is_active")
      .eq("is_active", true)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(20);

    if (productError) {
      console.error("Search error:", productError);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Also search menu items if table exists (gracefully handle missing table)
    let menuItems: any[] = [];
    try {
      const { data: menu } = await supabaseAdmin()
        .from("menu_items")
        .select("id, name, description, price_cents, category")
        .eq("is_active", true)
        .ilike("name", `%${q}%`)
        .limit(10);
      if (menu) menuItems = menu;
    } catch {
      // menu_items table may not exist yet
    }

    return NextResponse.json({
      query: q,
      products: products ?? [],
      menu_items: menuItems,
      total: (products?.length ?? 0) + menuItems.length,
    });
  } catch (err) {
    console.error("Search route error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getPosCatalog, mapPosCatalogItemToProduct } from "@/lib/pos/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Force dynamic — don't try to build statically (needs env vars at runtime)
export const dynamic = "force-dynamic";

// GET /api/products — list products with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const includePos = searchParams.get("includePos") !== "false";
  const source = searchParams.get("source") ?? "all";
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let products: any[] = [];

  if (source !== "pos") {
    let query = supabaseAdmin()
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);
    if (featured === "true") query = query.eq("is_featured", true);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    products = data ?? [];
  }

  if (includePos && source !== "online") {
    try {
      const channelLabel = source === "menu" ? "menu" : "shop";
      const catalog = await getPosCatalog({ channel: channelLabel, includeModifiers: false, limit });
      const posProducts = catalog.items
        .map(mapPosCatalogItemToProduct)
        .filter((product) => !category || product.category === category)
        .filter((product) => featured !== "true" || product.is_featured);

      products = [...posProducts, ...products];
    } catch (error) {
      console.error("Failed to append POS catalog products", error);
      if (source === "pos") {
        return NextResponse.json(
          {
            error: "Failed to load POS catalog products",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ products: products.slice(0, limit) });
}

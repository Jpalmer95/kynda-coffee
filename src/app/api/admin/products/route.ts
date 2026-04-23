import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabaseAdmin()
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error("Products fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: products ?? [] });
  } catch (err) {
    console.error("Products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      name,
      slug,
      description,
      category,
      price_cents,
      compare_price_cents,
      images,
      inventory_count,
      track_inventory,
      source,
      square_catalog_id,
      printful_variant_id,
      weight_oz,
      is_active = true,
      is_featured = false,
    } = body;

    if (!name || !slug || !category || price_cents == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, slug, category, price_cents" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const { data: existing } = await supabaseAdmin()
      .from("products")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A product with this slug already exists" },
        { status: 409 }
      );
    }

    const { data: product, error } = await supabaseAdmin()
      .from("products")
      .insert({
        name,
        slug,
        description: description ?? "",
        category,
        price_cents: Number(price_cents),
        compare_price_cents: compare_price_cents ? Number(compare_price_cents) : null,
        images: images ?? [],
        inventory_count: inventory_count ?? 0,
        track_inventory: track_inventory ?? true,
        source: source ?? "online",
        square_catalog_id: square_catalog_id ?? null,
        printful_variant_id: printful_variant_id ?? null,
        weight_oz: weight_oz ?? null,
        is_active,
        is_featured,
      })
      .select()
      .single();

    if (error) {
      console.error("Product create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("Product create error:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

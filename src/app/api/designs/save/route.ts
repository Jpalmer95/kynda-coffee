import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/designs/save — List current user's saved designs
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");

  let query = supabaseAdmin()
    .from("saved_designs")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ designs: data ?? [] });
}

/**
 * POST /api/designs/save — Create or update a saved design
 *
 * Body: {
 *   id?: string,              // If provided, UPDATE existing; else INSERT new
 *   name?: string,
 *   product_id?: string,      // Printful catalog ID (e.g. "unisex-tee")
 *   variant_id?: number,      // Printful variant ID
 *   product_type?: string,    // Legacy: mug, tshirt, etc.
 *   layers: DesignLayer[],    // Canvas layer data (JSONB)
 *   view?: "front" | "back",
 *   thumbnail_url?: string,   // Data URL or Supabase Storage URL
 *   prompt?: string,          // AI prompt (if generated)
 *   original_image_url?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      id,
      name,
      product_id,
      variant_id,
      product_type,
      layers,
      view,
      thumbnail_url,
      prompt,
      original_image_url,
    } = body;

    if (!layers || !Array.isArray(layers)) {
      return NextResponse.json({ error: "layers array is required" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // If ID provided → update existing design (must belong to user)
    if (id) {
      const { data: existing, error: fetchErr } = await db
        .from("saved_designs")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: "Design not found or not owned by you" }, { status: 404 });
      }

      const { data, error } = await db
        .from("saved_designs")
        .update({
          // Only touch the name when the client explicitly sends one
          ...(name ? { name } : {}),
          product_id,
          variant_id,
          product_type: product_type || product_id,
          layers: layers as any,
          view: view || "front",
          thumbnail_url,
          prompt,
          original_image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ design: data, action: "updated" });
    }

    // No ID → create new design
    const { data, error } = await db
      .from("saved_designs")
      .insert({
        user_id: user.id,
        name: name || "Untitled Design",
        product_id,
        variant_id,
        product_type: product_type || product_id,
        layers: layers as any,
        view: view || "front",
        thumbnail_url,
        prompt,
        original_image_url,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ design: data, action: "created" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

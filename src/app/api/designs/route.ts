import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/designs — list designs (public gallery or user's own)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  let query = supabaseAdmin()
    .from("designs")
    .select("*")
    .eq("is_public", true)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (featured === "true") query = query.gte("likes", 5);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ designs: data });
}

// POST /api/designs — save a generated design
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const design = {
      name: body.name ?? "Untitled Design",
      description: body.description,
      category: body.category ?? "customer-created",
      status: "draft" as const,
      prompt: body.prompt,
      style_preset: body.style_preset,
      original_image_url: body.image_url,
      mockup_urls: body.mockup_urls ?? [],
      applicable_products: body.applicable_products ?? [],
      is_public: false,
    };

    const { data, error } = await supabaseAdmin()
      .from("designs")
      .insert(design as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ design: data });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

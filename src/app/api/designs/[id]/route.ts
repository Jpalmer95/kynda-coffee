import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/designs/[id] — Get a single saved design
 */
export async function GET(
  req: NextRequest,
  ctx: RouteContext
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from("saved_designs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  return NextResponse.json({ design: data });
}

/**
 * PUT /api/designs/[id] — Update a saved design
 */
export async function PUT(
  req: NextRequest,
  ctx: RouteContext
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const { name, layers, view, thumbnail_url, variant_id } = body;

  // Verify ownership
  const { data: existing } = await supabaseAdmin()
    .from("saved_designs")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Design not found or not owned by you" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (layers !== undefined) updates.layers = layers;
  if (view !== undefined) updates.view = view;
  if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
  if (variant_id !== undefined) updates.variant_id = variant_id;

  const { data, error } = await supabaseAdmin()
    .from("saved_designs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ design: data });
}

/**
 * DELETE /api/designs/[id] — Delete a saved design
 */
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // Verify ownership
  const { data: existing } = await supabaseAdmin()
    .from("saved_designs")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Design not found or not owned by you" }, { status: 404 });
  }

  const { error } = await supabaseAdmin()
    .from("saved_designs")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

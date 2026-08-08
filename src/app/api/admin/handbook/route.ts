import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/handbook — all handbook sections
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("handbook_sections")
    .select("*")
    .order("order_index");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data ?? [] });
}

/**
 * POST — create a section
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from("handbook_sections")
      .insert({
        title,
        content: Array.isArray(body.content) ? body.content : [body.content ?? ""],
        order_index: body.order_index ?? 99,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ section: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

/**
 * PATCH — update a section
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { last_updated: new Date().toISOString() };
    if (body.title !== undefined) payload.title = body.title;
    if (body.content !== undefined) payload.content = Array.isArray(body.content) ? body.content : [body.content];
    if (body.order_index !== undefined) payload.order_index = body.order_index;

    const { data, error } = await supabaseAdmin()
      .from("handbook_sections")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ section: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

/**
 * DELETE — delete a section
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("handbook_sections")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

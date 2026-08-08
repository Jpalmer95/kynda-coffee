import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/checklists — all shift checklists with items
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin()
      .from("checklists")
      .select("id, title, description, type, items, updated_at")
      .order("type");

    if (error) throw error;
    return NextResponse.json({ checklists: data ?? [] });
  } catch (error) {
    console.error("Admin checklists GET error", error);
    return NextResponse.json(
      { error: "Failed to load checklists", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/checklists
 * Body: { id, title?, description?, items? }
 * Update a checklist's items or metadata.
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) payload.title = String(body.title).slice(0, 200);
    if (body.description !== undefined) payload.description = body.description ? String(body.description).slice(0, 500) : null;
    if (body.items !== undefined) {
      if (!Array.isArray(body.items)) return NextResponse.json({ error: "items must be an array" }, { status: 400 });
      payload.items = body.items;
    }

    const { data, error } = await supabaseAdmin()
      .from("checklists")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ checklist: data });
  } catch (error) {
    console.error("Admin checklist PATCH error", error);
    return NextResponse.json(
      { error: "Failed to update checklist", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

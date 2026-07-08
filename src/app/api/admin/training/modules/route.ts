import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "onboarding", "opening", "closing", "drinks", "food",
  "equipment", "safety", "customer_service", "maintenance",
];

/**
 * GET /api/admin/training/modules
 *   - ?id=<uuid> → single module
 *   - (no params) → all modules
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const { data, error } = await supabaseAdmin()
        .from("training_modules")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Module not found" }, { status: 404 });

      // Get completion count
      const { count } = await supabaseAdmin()
        .from("training_completions")
        .select("id", { count: "exact", head: true })
        .eq("module_id", id);

      return NextResponse.json({ module: data, completion_count: count ?? 0 });
    }

    const { data, error } = await supabaseAdmin()
      .from("training_modules")
      .select("*")
      .order("category", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ modules: data ?? [], categories: CATEGORIES });
  } catch (error) {
    console.error("Training modules GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch modules", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/training/modules
 * Create a new module.
 * Body: { title, description?, category, content, is_required?, order_index? }
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("training_modules")
      .insert({
        title,
        description: body.description ?? null,
        category: body.category,
        content: body.content ?? "",
        is_required: body.is_required ?? false,
        order_index: body.order_index ?? 0,
        created_by: team.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ module: data });
  } catch (error) {
    console.error("Training module POST error", error);
    return NextResponse.json(
      { error: "Failed to create module", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/training/modules
 * Update a module.
 * Body: { id, title?, description?, category?, content?, is_required?, order_index? }
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    if (updates.category && !CATEGORIES.includes(updates.category)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
    }

    // Filter to allowed fields
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of ["title", "description", "category", "content", "is_required", "order_index"]) {
      if (field in updates) payload[field] = updates[field];
    }

    const { data, error } = await supabaseAdmin()
      .from("training_modules")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ module: data });
  } catch (error) {
    console.error("Training module PATCH error", error);
    return NextResponse.json(
      { error: "Failed to update module", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/training/modules?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("training_modules")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

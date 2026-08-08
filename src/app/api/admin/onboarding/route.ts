import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/onboarding — documents + per-hire progress
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [docsRes, progressRes] = await Promise.all([
      supabaseAdmin()
        .from("onboarding_documents")
        .select("*")
        .order("sort_order"),
      supabaseAdmin()
        .from("onboarding_progress")
        .select(`
          id, task_key, task_label, status, hire_email, hire_name,
          notes, completed_at, updated_at
        `)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

    return NextResponse.json({
      documents: docsRes.data ?? [],
      progress: progressRes.data ?? [],
    });
  } catch (error) {
    console.error("Onboarding admin GET error", error);
    return NextResponse.json({ error: "Failed to load onboarding data" }, { status: 500 });
  }
}

/**
 * POST — create or update an onboarding document
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from("onboarding_documents")
      .insert({
        title,
        description: body.description ?? null,
        category: body.category ?? "other",
        external_url: body.external_url ?? null,
        storage_path: body.storage_path ?? null,
        file_type: body.file_type ?? "link",
        is_required: body.is_required ?? false,
        sort_order: body.sort_order ?? 99,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ document: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

/**
 * PATCH — update document
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of ["title", "description", "category", "external_url", "storage_path", "file_type", "is_required", "sort_order", "is_active"]) {
      if (f in body) payload[f] = body[f];
    }

    const { data, error } = await supabaseAdmin()
      .from("onboarding_documents")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ document: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

/**
 * DELETE — delete document
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("onboarding_documents")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

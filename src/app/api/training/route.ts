import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/training/modules — staff-facing list of training modules
 * (the system admins manage in /admin/training) plus the caller's
 * completion map. Returns modules grouped by category for display.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [modulesRes, completionsRes] = await Promise.all([
      supabaseAdmin()
        .from("training_modules")
        .select("id, title, description, category, content, order_index, is_required, updated_at")
        .order("category", { ascending: true })
        .order("order_index", { ascending: true }),
      supabaseAdmin()
        .from("training_completions")
        .select("module_id, completed_at")
        .eq("user_id", team.user.id),
    ]);

    if (modulesRes.error) throw modulesRes.error;
    if (completionsRes.error) throw completionsRes.error;

    const completedMap: Record<string, string> = {};
    for (const c of completionsRes.data ?? []) {
      completedMap[c.module_id] = c.completed_at;
    }

    return NextResponse.json({
      modules: modulesRes.data ?? [],
      completed: completedMap,
    });
  } catch (error) {
    console.error("Training modules staff GET error", error);
    return NextResponse.json(
      { error: "Failed to load training", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/training/complete
 * Body: { module_id, completed: boolean }
 * Marks (or unmarks) a module complete for the caller.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const moduleId = typeof body.module_id === "string" ? body.module_id : "";
    const completed = body.completed !== false;

    if (!moduleId) return NextResponse.json({ error: "module_id is required" }, { status: 400 });

    // Verify the module exists
    const { data: mod, error: modErr } = await supabaseAdmin()
      .from("training_modules")
      .select("id")
      .eq("id", moduleId)
      .maybeSingle();
    if (modErr) throw modErr;
    if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

    if (completed) {
      const { error } = await supabaseAdmin()
        .from("training_completions")
        .upsert(
          { module_id: moduleId, user_id: team.user.id, completed_at: new Date().toISOString() },
          { onConflict: "module_id,user_id" }
        );
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin()
        .from("training_completions")
        .delete()
        .eq("module_id", moduleId)
        .eq("user_id", team.user.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, completed });
  } catch (error) {
    console.error("Training completion POST error", error);
    return NextResponse.json(
      { error: "Failed to update completion", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

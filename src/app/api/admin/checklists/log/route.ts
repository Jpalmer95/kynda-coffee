import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/checklists/log
 *   Query params: ?member=<user_id>  → filter by team member
 *                 ?from=YYYY-MM-DD   → start date
 *                 ?to=YYYY-MM-DD     → end date
 *                 ?type=opening|closing|mid-shift
 *
 * Returns completion records joined with profiles for the admin log.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const member = searchParams.get("member");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");

    let query = supabaseAdmin()
      .from("checklist_completions")
      .select(`
        id,
        checklist_type,
        checklist_id,
        completed_by,
        completed_items,
        completed_at,
        notes,
        profiles:completed_by (full_name, email)
      `)
      .order("completed_at", { ascending: false })
      .limit(200);

    if (member) query = query.eq("completed_by", member);
    if (type) query = query.eq("checklist_type", type);
    if (from) query = query.gte("completed_at", `${from}T00:00:00`);
    if (to) query = query.lte("completed_at", `${to}T23:59:59`);

    const { data, error } = await query;
    if (error) throw error;

    // Also fetch checklists for item reference
    const { data: checklists } = await supabaseAdmin()
      .from("checklists")
      .select("id, title, type, items");

    const checklistMap: Record<string, any> = {};
    for (const c of checklists ?? []) {
      checklistMap[c.type] = c;
    }

    return NextResponse.json({
      completions: (data ?? []).map((c: any) => ({
        id: c.id,
        checklist_type: c.checklist_type,
        completed_items: c.completed_items ?? [],
        completed_at: c.completed_at,
        notes: c.notes,
        member_name: c.profiles?.full_name || c.profiles?.email?.split("@")[0] || "Unknown",
        member_email: c.profiles?.email ?? null,
        checklist_title: checklistMap[c.checklist_type]?.title ?? c.checklist_type,
        checklist_items: checklistMap[c.checklist_type]?.items ?? [],
      })),
    });
  } catch (error) {
    console.error("Admin checklist log error", error);
    return NextResponse.json(
      { error: "Failed to load checklist log", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ChecklistRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  items: { text: string; order: number; is_critical?: boolean }[];
}

/**
 * GET /api/staff/checklists — all shift checklists from DB.
 * Returns items array for each type so the client renders what's in the DB,
 * not hardcoded seeds.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: checklists, error } = await supabaseAdmin()
      .from("checklists")
      .select("id, title, description, type, items")
      .order("type");

    if (error) throw error;

    // Also fetch today's completions for this user
    const todayISO = new Date().toISOString().split("T")[0];
    const { data: completions } = await supabaseAdmin()
      .from("checklist_completions")
      .select("id, checklist_type, checklist_id, completed_items, completed_at")
      .eq("completed_by", team.user.id)
      .gte("completed_at", `${todayISO}T00:00:00`)
      .order("completed_at", { ascending: false });

    // Build a map: type → completion record
    const completionMap: Record<string, any> = {};
    for (const c of completions ?? []) {
      const key = c.checklist_type || "";
      if (!completionMap[key]) completionMap[key] = c;
    }

    return NextResponse.json({
      checklists: (checklists ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        items: Array.isArray(c.items) ? c.items : [],
      })) as ChecklistRow[],
      completions: completionMap,
      me: team.user.id,
    });
  } catch (error) {
    console.error("Staff checklists GET error", error);
    return NextResponse.json(
      { error: "Failed to load checklists", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

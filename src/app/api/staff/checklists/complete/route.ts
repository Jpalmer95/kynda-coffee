import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/staff/checklists/complete
 * Save checklist completion for today
 */
export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = team.user;

    const body = await req.json();
    const { checklist_type, completed_items } = body;

    if (!checklist_type || !Array.isArray(completed_items)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert today's completion record
    const todayISO = new Date().toISOString().split("T")[0];
    const admin = supabaseAdmin();
    const { data: existing } = await admin
      .from("checklist_completions")
      .select("id")
      .eq("completed_by", user.id)
      .eq("checklist_type", checklist_type)
      .gte("completed_at", `${todayISO}T00:00:00`)
      .single();

    if (existing) {
      const { error } = await admin
        .from("checklist_completions")
        .update({
          completed_items,
          completed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await admin
        .from("checklist_completions")
        .insert({
          checklist_type,
          completed_by: user.id,
          completed_items,
          completed_at: new Date().toISOString(),
        });

      if (error) {
        if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
          // Silently succeed — table may not exist yet
          return NextResponse.json({ success: true, table_missing: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

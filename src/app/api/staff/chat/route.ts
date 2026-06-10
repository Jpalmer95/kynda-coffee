import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/chat?before=ISO — latest 50 team messages (team only).
 * POST — post a message. Realtime delivery happens client-side via the
 * `team_messages` publication (migration 028); this API is the write path
 * and history pagination.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");

  let query = supabaseAdmin()
    .from("team_messages")
    .select("id, user_id, body, created_at, profiles:user_id (full_name, email)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) {
    console.error("Team chat fetch error", error);
    return NextResponse.json({ error: "Failed to load chat." }, { status: 500 });
  }
  // Return oldest-first for rendering.
  return NextResponse.json({ messages: (data ?? []).reverse(), me: team.user.id });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limit = rateLimit(ip, { identifier: "team-chat", windowMs: 10_000, maxRequests: 10 });
  if (!limit.success) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const text = String(body.body ?? "").trim();
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: "Message must be 1–2000 characters." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("team_messages")
      .insert({ user_id: team.user.id, body: text })
      .select("id, user_id, body, created_at")
      .single();

    if (error) {
      console.error("Team chat post error", error);
      return NextResponse.json({ error: "Failed to send." }, { status: 500 });
    }
    return NextResponse.json({ message: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

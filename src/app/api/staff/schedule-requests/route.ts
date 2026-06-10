import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SELECT =
  "id, user_id, kind, starts_at, ends_at, reason, status, reviewed_by, reviewed_at, review_note, created_at";

/**
 * GET /api/staff/schedule-requests — own requests (staff) or all pending+recent (manager+).
 * POST — create a request (any team member, for themselves).
 * PATCH — approve/deny (manager+) or cancel own pending request.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = team.role === "manager" || team.role === "owner";
  let query = supabaseAdmin()
    .from("schedule_requests")
    .select(`${SELECT}, profiles:user_id (full_name, email)`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isManager) query = query.eq("user_id", team.user.id);

  const { data, error } = await query;
  if (error) {
    console.error("Schedule requests fetch error", error);
    return NextResponse.json({ error: "Failed to load requests." }, { status: 500 });
  }
  return NextResponse.json({ requests: data ?? [], viewer_role: team.role });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const kind = ["time_off", "swap", "availability"].includes(body.kind) ? body.kind : "time_off";
    const { starts_at, ends_at, reason } = body;
    if (!starts_at || !ends_at) {
      return NextResponse.json({ error: "starts_at and ends_at are required." }, { status: 400 });
    }
    if (new Date(ends_at) < new Date(starts_at)) {
      return NextResponse.json({ error: "End must not be before start." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("schedule_requests")
      .insert({
        user_id: team.user.id,
        kind,
        starts_at,
        ends_at,
        reason: (reason || "").slice(0, 500) || null,
      })
      .select(SELECT)
      .single();

    if (error) {
      console.error("Schedule request create error", error);
      return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
    }
    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status as string;
    if (!id || !["approved", "denied", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "id and a valid status are required." }, { status: 400 });
    }

    const { data: current, error: fetchErr } = await supabaseAdmin()
      .from("schedule_requests")
      .select("id, user_id, status")
      .eq("id", id)
      .single();
    if (fetchErr || !current) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const isManager = team.role === "manager" || team.role === "owner";
    const isOwnRequest = current.user_id === team.user.id;

    if (status === "cancelled") {
      if (!isOwnRequest && !isManager) {
        return NextResponse.json({ error: "You can only cancel your own request." }, { status: 403 });
      }
    } else if (!isManager) {
      return NextResponse.json({ error: "Only a team lead can approve or deny." }, { status: 403 });
    }

    if (current.status !== "pending") {
      return NextResponse.json({ error: "Request was already reviewed." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("schedule_requests")
      .update({
        status,
        reviewed_by: status === "cancelled" ? null : team.user.id,
        reviewed_at: status === "cancelled" ? null : new Date().toISOString(),
        review_note: (body.review_note || "").slice(0, 500) || null,
      })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to update request." }, { status: 500 });
    }
    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

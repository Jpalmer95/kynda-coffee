import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SELECT = "id, user_id, starts_at, ends_at, station, notes, published, created_at";

/**
 * GET /api/staff/schedule?from=ISO&to=ISO — shifts in a window (team).
 * Staff see published shifts; managers also see drafts.
 * POST — create a shift (manager+).
 * PATCH — update/publish a shift (manager+).
 * DELETE ?id= — remove a shift (manager+).
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date().toISOString();
  const to =
    searchParams.get("to") ??
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin()
    .from("shifts")
    .select(`${SELECT}, profiles:user_id (full_name, email)`)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true });

  const isManager = team.role === "manager" || team.role === "owner";
  if (!isManager) query = query.eq("published", true);

  const { data, error } = await query;
  if (error) {
    console.error("Schedule fetch error", error);
    return NextResponse.json({ error: "Failed to load schedule." }, { status: 500 });
  }
  return NextResponse.json({ shifts: data ?? [], viewer_role: team.role });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { user_id, starts_at, ends_at, station, notes, published } = body;
    if (!user_id || !starts_at || !ends_at) {
      return NextResponse.json({ error: "user_id, starts_at, ends_at required." }, { status: 400 });
    }
    if (new Date(ends_at) <= new Date(starts_at)) {
      return NextResponse.json({ error: "Shift must end after it starts." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("shifts")
      .insert({
        user_id,
        starts_at,
        ends_at,
        station: station || "barista",
        notes: notes || null,
        published: Boolean(published),
        created_by: team.user.id,
      })
      .select(SELECT)
      .single();

    if (error) {
      console.error("Shift create error", error);
      return NextResponse.json({ error: "Failed to create shift." }, { status: 500 });
    }
    return NextResponse.json({ shift: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Shift id required." }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of ["starts_at", "ends_at", "station", "notes", "published", "user_id"]) {
      if (k in body) updates[k] = body[k];
    }

    const { data, error } = await supabaseAdmin()
      .from("shifts")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to update shift." }, { status: 500 });
    }
    return NextResponse.json({ shift: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Shift id required." }, { status: 400 });

  const { error } = await supabaseAdmin().from("shifts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete shift." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

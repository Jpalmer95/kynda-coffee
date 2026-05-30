import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["new", "read", "replied", "archived"];

/** GET — list contact submissions (default newest first); ?status= to filter, ?type= optional. */
export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const status = params.get("status");
  const type = params.get("type");

  let query = supabaseAdmin()
    .from("contact_submissions")
    .select("id, name, email, message, type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (type && type !== "all") query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Unread count for the badge.
  const { count: unread } = await supabaseAdmin()
    .from("contact_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  return NextResponse.json({ submissions: data ?? [], unread: unread ?? 0 });
}

/** POST — { id, status } update a submission's triage status. */
export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, status } = await req.json();
    if (!id || typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUS.join(", ")}` }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin()
      .from("contact_submissions")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, submission: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Update failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

/** DELETE — remove a submission by ?id=. */
export async function DELETE(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin().from("contact_submissions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

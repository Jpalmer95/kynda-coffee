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

  // Catering quote requests live in their own table; surface them in the same
  // inbox (normalized to the submission shape) so nothing gets missed.
  let cateringQuery = supabaseAdmin()
    .from("catering_requests")
    .select("id, name, email, phone, event_date, guest_count, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && status !== "all") {
    // legacy rows may carry 'pending' from the old client — treat as 'new'
    cateringQuery = status === "new" ? cateringQuery.in("status", ["new", "pending"]) : cateringQuery.eq("status", status);
  }

  const [{ data, error }, catering] = await Promise.all([query, cateringQuery]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (catering.error) console.error("Inbox catering fetch error:", catering.error);

  const cateringRows = (catering.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    message: [
      c.event_date ? `Event date: ${c.event_date}` : null,
      c.guest_count ? `Guests: ${c.guest_count}` : null,
      c.phone ? `Phone: ${c.phone}` : null,
      c.details || null,
    ]
      .filter(Boolean)
      .join("\n"),
    type: "catering",
    status: c.status === "pending" ? "new" : c.status,
    created_at: c.created_at,
    source_table: "catering_requests" as const,
  }));

  const submissions = [
    ...(data ?? []).map((s) => ({ ...s, source_table: "contact_submissions" as const })),
    ...(type && type !== "all" && type !== "catering" ? [] : cateringRows),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Unread count for the badge (both tables).
  const [{ count: unreadContact }, { count: unreadCatering }] = await Promise.all([
    supabaseAdmin()
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabaseAdmin()
      .from("catering_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "pending"]),
  ]);

  return NextResponse.json({
    submissions,
    unread: (unreadContact ?? 0) + (unreadCatering ?? 0),
  });
}

/** POST — { id, status, source_table? } update a submission's triage status. */
export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, status, source_table } = await req.json();
    if (!id || typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUS.join(", ")}` }, { status: 400 });
    }
    const table = source_table === "catering_requests" ? "catering_requests" : "contact_submissions";
    const { data, error } = await supabaseAdmin()
      .from(table)
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

/** DELETE — remove a submission by ?id= (&table=catering_requests for catering). */
export async function DELETE(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const table = params.get("table") === "catering_requests" ? "catering_requests" : "contact_submissions";
  const { error } = await supabaseAdmin().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

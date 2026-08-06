import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inbox/counts — untriaged submission counts for the Hermes
 * submissions watchdog cron. Accepts CRON_SECRET bearer, X-Agent-Key, or a
 * manager+ session. Returns counts (never content) so the cron script has no
 * DB credentials and no SSH dependency.
 *
 * Response: { applications_new, catering_new, contact_new, total }
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const agentKey = process.env.AGENT_API_KEY;
  const authHeader = req.headers.get("authorization");
  const headerAgentKey = req.headers.get("x-agent-key");

  const cronOk = cronSecret ? authHeader === `Bearer ${cronSecret}` : false;
  const agentOk = agentKey ? headerAgentKey === agentKey : false;

  let sessionOk = false;
  if (!cronOk && !agentOk) {
    const team = await requireTier(req, "manager");
    sessionOk = !!team;
  }
  if (!cronOk && !agentOk && !sessionOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [{ count: applicationsNew }, { count: cateringNew }, { count: contactNew }] =
      await Promise.all([
        supabaseAdmin()
          .from("job_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabaseAdmin()
          .from("catering_requests")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "pending"]),
        supabaseAdmin()
          .from("contact_submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
      ]);

    const total = (applicationsNew ?? 0) + (cateringNew ?? 0) + (contactNew ?? 0);
    return NextResponse.json({
      applications_new: applicationsNew ?? 0,
      catering_new: cateringNew ?? 0,
      contact_new: contactNew ?? 0,
      total,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Count query failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

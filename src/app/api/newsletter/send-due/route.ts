import { NextRequest, NextResponse } from "next/server";
import { sendDueNewsletters } from "@/lib/marketing/newsletter-sender";

export const dynamic = "force-dynamic";

/**
 * Newsletter send cron (Roadmap V2 — Epic 5).
 *
 * Sends every APPROVED newsletter whose scheduled_at is null or in the past.
 * Only approved rows are ever sent (the approval gate is enforced in the sender,
 * which atomically flips approved -> sending). Nothing here can send a draft.
 *
 * Auth: CRON_SECRET bearer OR X-Agent-Key (same key as the daily-sync job).
 * Call hourly (or daily) from Hermes/Coolify cron.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const agentKey = process.env.AGENT_API_KEY;
  const authHeader = req.headers.get("authorization");
  const headerAgentKey = req.headers.get("x-agent-key");

  const cronOk = cronSecret ? authHeader === `Bearer ${cronSecret}` : false;
  const agentOk = agentKey ? headerAgentKey === agentKey : false;

  if (!cronOk && !agentOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await sendDueNewsletters();
  const totalSent = results.reduce((n, r) => n + r.sent, 0);
  const totalFailed = results.reduce((n, r) => n + r.failed, 0);

  return NextResponse.json({
    ok: true,
    newsletters: results.length,
    totalSent,
    totalFailed,
    results,
    message: results.length
      ? `Sent ${results.length} newsletter(s): ${totalSent} delivered, ${totalFailed} failed.`
      : "No approved newsletters due.",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/marketing/social/publisher";
import { timingSafeStringEqual } from "@/lib/auth/security";

// Cron endpoint - called by Coolify cron or external scheduler
// Secured by CRON_SECRET environment variable (fails closed if unset)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[publish-due] CRON_SECRET not configured — failing closed");
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    if (!timingSafeStringEqual(authHeader, `Bearer ${cronSecret}`)) {
      console.error(`[publish-due] rejected request: bad or missing authorization`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Running publish-due cron job...");
    const result = await publishDuePosts();
    console.log(`Cron complete: ${result.processed} processed, ${result.published} published, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      published: result.published,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error("Error in publish-due cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/marketing/social/publisher";

// Cron endpoint - called by Coolify cron or external scheduler
// Secured by CRON_SECRET environment variable

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If a secret is configured, require it; if not set, rely on Coolify network isolation (log warning once per deploy)
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.error(`[publish-due] rejected request: bad or missing authorization`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.warn("[publish-due] CRON_SECRET not set — endpoint is unauthenticated. Set it in Coolify for production.");
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

// POST /api/marketing/media/process-shorts
// Triggers ffmpeg-based shorts processing for an uploaded video.
// Creates platform-specific vertical variants + social_post drafts.

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { createShortsJob, processShortsJob, SHORTS_SPECS, type ShortsPlatform } from "@/lib/marketing/video/shorts-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max for video processing

export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { sourceUrl, sourceFilename, title, notes, platforms } = body;

    if (!sourceUrl || typeof sourceUrl !== "string") {
      return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 });
    }
    if (!sourceFilename || typeof sourceFilename !== "string") {
      return NextResponse.json({ error: "sourceFilename is required" }, { status: 400 });
    }

    const selectedPlatforms: ShortsPlatform[] =
      Array.isArray(platforms) && platforms.length > 0
        ? platforms.filter((p: string) => p in SHORTS_SPECS)
        : (["tiktok", "instagram", "youtube"] as ShortsPlatform[]);

    const job = createShortsJob({
      sourceUrl,
      sourceFilename,
      title: typeof title === "string" ? title : undefined,
      notes: typeof notes === "string" ? notes : undefined,
      platforms: selectedPlatforms,
    });

    // Process synchronously (within the 5min timeout)
    const result = await processShortsJob(job);

    return NextResponse.json({
      ok: result.status === "completed",
      status: result.status,
      jobId: result.id,
      results: result.results ?? [],
      error: result.error,
      message:
        result.status === "completed"
          ? `Created ${result.results?.length ?? 0} shorts variants → approval queue`
          : result.error || "Processing failed",
    });
  } catch (err) {
    console.error("[marketing/media/process-shorts] Error:", err);
    return NextResponse.json(
      { error: "Processing failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

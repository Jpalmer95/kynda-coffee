/**
 * Video / Shorts Processing Pipeline (stub).
 *
 * Design: raw video → platform-specific vertical shorts (9:16, 60s max).
 * This module defines the processing plan and queue structure. Actual ffmpeg
 * processing will be implemented when server-side ffmpeg is confirmed.
 *
 * Platform specs for vertical shorts:
 *  - TikTok: 9:16, 1080x1920, max 60s, MP4/H.264
 *  - Instagram Reels: 9:16, 1080x1920, max 90s, MP4/H.264
 *  - YouTube Shorts: 9:16, 1080x1920, max 60s, MP4/H.264
 *
 * Processing steps (future):
 *  1. Probe source video (ffprobe) — duration, resolution, codec
 *  2. Extract interesting 15-60s segments (or use full if short enough)
 *  3. Crop to 9:16 vertical (center crop or subject detection)
 *  4. Add caption overlay (brand text, optional subtitles)
 *  5. Add watermark (Kynda logo, subtle, bottom-right)
 *  6. Encode to H.264 MP4 at target resolution
 *  7. Upload variants to Supabase Storage
 *  8. Create social_posts drafts (pending_approval) for each platform
 */

export type ShortsPlatform = "tiktok" | "instagram" | "youtube";

export interface ShortsSpec {
  platform: ShortsPlatform;
  width: number;
  height: number;
  maxDurationSec: number;
  codec: string;
  format: string;
}

export const SHORTS_SPECS: Record<ShortsPlatform, ShortsSpec> = {
  tiktok: { platform: "tiktok", width: 1080, height: 1920, maxDurationSec: 60, codec: "h264", format: "mp4" },
  instagram: { platform: "instagram", width: 1080, height: 1920, maxDurationSec: 90, codec: "h264", format: "mp4" },
  youtube: { platform: "youtube", width: 1080, height: 1920, maxDurationSec: 60, codec: "h264", format: "mp4" },
};

export interface VideoProcessingJob {
  id: string;
  sourceUrl: string;
  sourceFilename: string;
  title?: string;
  notes?: string;
  platforms: ShortsPlatform[];
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  results?: Array<{
    platform: ShortsPlatform;
    url: string;
    durationSec: number;
  }>;
  error?: string;
}

/**
 * Create a video processing job.
 * Phase 1: just validates and returns the job structure.
 * Phase 2: will queue for ffmpeg processing.
 */
export function createShortsJob(input: {
  sourceUrl: string;
  sourceFilename: string;
  title?: string;
  notes?: string;
  platforms?: ShortsPlatform[];
}): VideoProcessingJob {
  const platforms = input.platforms?.length
    ? input.platforms
    : (["tiktok", "instagram", "youtube"] as ShortsPlatform[]);

  return {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceUrl: input.sourceUrl,
    sourceFilename: input.sourceFilename,
    title: input.title,
    notes: input.notes,
    platforms,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Check if ffmpeg is available on the server.
 * Call this before attempting video processing.
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    const { execFile } = await import("child_process");
    return await new Promise((resolve) => {
      execFile("ffmpeg", ["-version"], (err) => resolve(!err));
    });
  } catch {
    return false;
  }
}

/**
 * Future: process a shorts job using ffmpeg.
 * Extracts, crops, overlays, and encodes platform-specific variants.
 *
 * Not implemented yet — requires server-side ffmpeg.
 * When ready, this function will:
 *  1. Download source video from Supabase Storage
 *  2. Probe with ffprobe
 *  3. For each platform in the job:
 *     a. Extract segment (full or trimmed to maxDurationSec)
 *     b. Crop to 9:16 (center crop)
 *     c. Add caption overlay + watermark
 *     d. Encode to H.264 MP4
 *     e. Upload to Supabase Storage marketing-videos/processed/
 *  4. Create social_posts drafts (pending_approval)
 *  5. Update job status
 */
export async function processShortsJob(_job: VideoProcessingJob): Promise<VideoProcessingJob> {
  const available = await checkFfmpegAvailable();
  if (!available) {
    return {
      ..._job,
      status: "failed",
      error: "ffmpeg not available on server. Install ffmpeg to enable video processing.",
    };
  }

  // TODO: Implement ffmpeg processing when server is ready.
  // For now, return as-is (queued).
  return _job;
}

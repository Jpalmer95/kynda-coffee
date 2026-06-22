/**
 * Video / Shorts Processing Pipeline.
 *
 * Raw video → platform-specific vertical shorts (9:16, 60s max).
 * Uses ffmpeg (installed on the VPS) via child_process.
 *
 * Platform specs for vertical shorts:
 *  - TikTok: 9:16, 1080x1920, max 60s, MP4/H.264
 *  - Instagram Reels: 9:16, 1080x1920, max 90s, MP4/H.264
 *  - YouTube Shorts: 9:16, 1080x1920, max 60s, MP4/H.264
 *
 * Processing steps:
 *  1. Probe source video (ffprobe) — duration, resolution, codec
 *  2. Trim to maxDurationSec if source is longer
 *  3. Crop to 9:16 vertical (center crop)
 *  4. Add watermark overlay (Kynda logo text, subtle, bottom-right)
 *  5. Encode to H.264 MP4 at 1080x1920
 *  6. Upload variants to Supabase Storage marketing-videos/processed/
 *  7. Create social_posts drafts (pending_approval) for each platform
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSocialPost } from "@/lib/marketing/social/publisher";

const execFileAsync = promisify(execFile);

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

/** Check if ffmpeg is available on the server. */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

interface VideoProbe {
  duration: number;
  width: number;
  height: number;
  codec: string;
  hasAudio: boolean;
}

/** Probe a video file with ffprobe to get metadata. */
async function probeVideo(filePath: string): Promise<VideoProbe> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const data = JSON.parse(stdout);
  const videoStream = (data.streams || []).find((s: { codec_type: string }) => s.codec_type === "video");
  const audioStream = (data.streams || []).find((s: { codec_type: string }) => s.codec_type === "audio");

  return {
    duration: parseFloat(data.format?.duration || "0"),
    width: parseInt(videoStream?.width || "0", 10),
    height: parseInt(videoStream?.height || "0", 10),
    codec: videoStream?.codec_name || "unknown",
    hasAudio: !!audioStream,
  };
}

/**
 * Build ffmpeg filter chain for vertical short:
 *  1. Scale to fill 1080x1920 (may crop sides)
 *  2. Crop to exact 1080x1920 centered
 *  3. Draw text watermark bottom-right
 *
 * Returns the -vf filter_complex string.
 */
function buildVideoFilter(spec: ShortsSpec, title?: string): string {
  // Scale to cover target, then center-crop to exact dimensions
  const scaleCrop = [
    `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase`,
    `crop=${spec.width}:${spec.height}`,
  ];

  // Add subtle watermark text at bottom-right
  // Using drawtext with a fallback font path
  const watermarkText = title ? title.slice(0, 30) : "Kynda Coffee";
  const drawtext = [
    "drawtext=",
    `text='${watermarkText.replace(/'/g, "\\'")}'`,
    ":fontcolor=white@0.5",
    ":fontsize=28",
    ":x=w-text_w-20",
    ":y=h-text_h-20",
    ":fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ].join("");

  return [...scaleCrop, drawtext].join(",");
}

/**
 * Download a file from a URL to a temp path.
 */
async function downloadToTemp(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { writeFile } = await import("fs/promises");
  await writeFile(destPath, buffer);
}

/**
 * Process a shorts job using ffmpeg.
 * Downloads source video, creates platform-specific vertical variants,
 * uploads them to Supabase Storage, and creates social_posts drafts.
 */
export async function processShortsJob(job: VideoProcessingJob): Promise<VideoProcessingJob> {
  const available = await checkFfmpegAvailable();
  if (!available) {
    return {
      ...job,
      status: "failed",
      error: "ffmpeg not available on server.",
    };
  }

  const { mkdtemp, rm, readFile } = await import("fs/promises");
  const { join } = await import("path");
  const { tmpdir } = await import("os");

  const tmpDir = await mkdtemp(join(tmpdir(), "kynda-shorts-"));
  const results: Array<{ platform: ShortsPlatform; url: string; durationSec: number }> = [];

  try {
    // 1. Download source video
    const sourcePath = join(tmpDir, "source.mp4");
    await downloadToTemp(job.sourceUrl, sourcePath);

    // 2. Probe source
    const probe = await probeVideo(sourcePath);
    if (probe.duration === 0 || probe.width === 0) {
      throw new Error("Invalid video file — no video stream detected.");
    }

    // 3. Process each platform variant
    for (const platform of job.platforms) {
      const spec = SHORTS_SPECS[platform];
      const outputPath = join(tmpDir, `${platform}.mp4`);

      // Calculate trim duration
      const trimDuration = Math.min(probe.duration, spec.maxDurationSec);

      // Build ffmpeg command
      const args: string[] = [
        "-y", // overwrite output
        "-i", sourcePath,
        "-t", String(trimDuration), // trim to max duration
        "-vf", buildVideoFilter(spec, job.title),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23", // quality (lower = better, 18-28 is good range)
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart", // web-optimized
        "-r", "30", // 30fps
        outputPath,
      ];

      await execFileAsync("ffmpeg", args, { timeout: 120000 }); // 2min timeout per platform

      // 4. Upload to Supabase Storage
      const adminClient = getSupabaseAdmin();
      const processedBuffer = await readFile(outputPath);
      const storagePath = `processed/${job.id}/${platform}.mp4`;

      const { error: uploadError } = await adminClient.storage
        .from("marketing-videos")
        .upload(storagePath, processedBuffer, {
          contentType: "video/mp4",
          upsert: false,
        });

      if (uploadError) {
        console.error(`[shorts] Upload failed for ${platform}:`, uploadError.message);
        continue;
      }

      const { data: urlData } = adminClient.storage
        .from("marketing-videos")
        .getPublicUrl(storagePath);

      results.push({
        platform,
        url: urlData.publicUrl,
        durationSec: trimDuration,
      });

      // 5. Create social_post draft (pending_approval)
      const caption = buildShortsCaption(platform, job.title, job.notes);
      await createSocialPost({
        platform: platform === "youtube" ? "tiktok" : platform, // DB doesn't have youtube yet
        text: caption,
        image_urls: [],
        status: "pending_approval",
        source: "agent",
      });
    }

    // 6. Cleanup temp files
    await rm(tmpDir, { recursive: true, force: true });

    return {
      ...job,
      status: results.length > 0 ? "completed" : "failed",
      results,
      error: results.length === 0 ? "All platform processing failed" : undefined,
    };
  } catch (err) {
    // Cleanup on error
    try { await rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    return {
      ...job,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown processing error",
    };
  }
}

/** Generate a platform-appropriate caption for a short video. */
function buildShortsCaption(platform: ShortsPlatform, title?: string, notes?: string): string {
  const subject = title?.trim() || "Behind the scenes at Kynda";
  const base = notes?.trim() || "Fresh from the bar — come see us!";

  if (platform === "tiktok") {
    return `${subject} ☕ ${base}\n\n#KyndaCoffee #SpecialtyCoffee #CoffeeTikTok #HorseshoeBayTX #TexasCoffee`;
  }
  if (platform === "instagram") {
    return `✨ ${subject}\n\n${base}\n\nCrafted with care in Horseshoe Bay, TX — come let us kindle your morning. ☕\n\n#KyndaCoffee #SpecialtyCoffee #HorseshoeBayTX #TexasCoffee #CoffeeReels #BaristaLife`;
  }
  // YouTube Shorts
  return `${subject} — ${base}\n\n#KyndaCoffee #SpecialtyCoffee #CoffeeShorts #HorseshoeBayTX`;
}

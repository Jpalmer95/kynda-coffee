// Image processing pipeline for marketing images
// Handles platform-specific resizing, watermarking, and metadata extraction

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// ─── Platform presets ────────────────────────────────────────────────────────
export interface PlatformPreset {
  key: string;
  label: string;
  width: number;
  height: number;
  fit: "cover" | "contain" | "fill";
  platform: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { key: "ig-square", label: "Instagram Feed (Square)", width: 1080, height: 1080, fit: "cover", platform: "instagram" },
  { key: "ig-portrait", label: "Instagram Feed (Portrait)", width: 1080, height: 1350, fit: "cover", platform: "instagram" },
  { key: "ig-story", label: "Instagram Story / Reel", width: 1080, height: 1920, fit: "cover", platform: "instagram" },
  { key: "fb-post", label: "Facebook Post", width: 1200, height: 630, fit: "cover", platform: "facebook" },
  { key: "fb-cover", label: "Facebook Cover", width: 820, height: 312, fit: "cover", platform: "facebook" },
  { key: "x-post", label: "X (Twitter) Post", width: 1200, height: 675, fit: "cover", platform: "twitter" },
  { key: "tiktok", label: "TikTok", width: 1080, height: 1920, fit: "cover", platform: "tiktok" },
];

// ─── Logo cache ──────────────────────────────────────────────────────────────
let _logoBuffer: Buffer | null = null;

async function getLogoBuffer(): Promise<Buffer> {
  if (_logoBuffer) return _logoBuffer;
  const logoPath = path.join(process.cwd(), "public", "images", "logos", "kynda-logo-black.png");
  _logoBuffer = await fs.readFile(logoPath);
  return _logoBuffer;
}

// ─── Resize for a specific platform preset ───────────────────────────────────
export async function resizeForPlatform(
  inputBuffer: Buffer,
  preset: PlatformPreset
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(preset.width, preset.height, {
      fit: preset.fit,
      position: "centre",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

// ─── Add watermark ───────────────────────────────────────────────────────────
export interface WatermarkOptions {
  position?: "southeast" | "southwest" | "northeast" | "northwest" | "center";
  opacity?: number; // 0–1, default 0.15
  scale?: number; // fraction of image width, default 0.12
}

export async function addWatermark(
  inputBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  const { position = "southeast", opacity = 0.15, scale = 0.12 } = options;

  const metadata = await sharp(inputBuffer).metadata();
  const imgWidth = metadata.width || 1080;
  const logoSize = Math.round(imgWidth * scale);

  const logoBuffer = await getLogoBuffer();

  // Resize logo and set opacity
  const logo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: "inside" })
    .ensureAlpha()
    .modulate({ brightness: 1 })
    .linear(opacity, 0)
    .toBuffer();

  // Composite watermark onto image
  return sharp(inputBuffer)
    .composite([
      {
        input: logo,
        gravity: position,
        blend: "over",
      },
    ])
    .toBuffer();
}

// ─── Full pipeline: resize + watermark for all presets ───────────────────────
export interface ProcessedImage {
  presetKey: string;
  label: string;
  platform: string;
  buffer: Buffer;
  width: number;
  height: number;
}

export async function processAllPlatforms(
  inputBuffer: Buffer,
  options: {
    watermark?: boolean | WatermarkOptions;
    presets?: PlatformPreset[];
  } = {}
): Promise<ProcessedImage[]> {
  const { watermark = true, presets = PLATFORM_PRESETS } = options;
  const results: ProcessedImage[] = [];

  for (const preset of presets) {
    let buffer = await resizeForPlatform(inputBuffer, preset);

    if (watermark) {
      const wmOptions: WatermarkOptions =
        typeof watermark === "object" ? watermark : {};
      buffer = await addWatermark(buffer, wmOptions);
    }

    const meta = await sharp(buffer).metadata();
    results.push({
      presetKey: preset.key,
      label: preset.label,
      platform: preset.platform,
      buffer,
      width: meta.width || preset.width,
      height: meta.height || preset.height,
    });
  }

  return results;
}

// ─── Single-preset processing ────────────────────────────────────────────────
export async function processForPreset(
  inputBuffer: Buffer,
  presetKey: string,
  watermark: boolean = true
): Promise<ProcessedImage | null> {
  const preset = PLATFORM_PRESETS.find((p) => p.key === presetKey);
  if (!preset) return null;

  let buffer = await resizeForPlatform(inputBuffer, preset);
  if (watermark) {
    buffer = await addWatermark(buffer);
  }
  const meta = await sharp(buffer).metadata();

  return {
    presetKey: preset.key,
    label: preset.label,
    platform: preset.platform,
    buffer,
    width: meta.width || preset.width,
    height: meta.height || preset.height,
  };
}

// ─── Extract metadata from image ─────────────────────────────────────────────
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  density?: number;
}

export async function extractMetadata(inputBuffer: Buffer): Promise<ImageMetadata> {
  const meta = await sharp(inputBuffer).metadata();
  return {
    width: meta.width || 0,
    height: meta.height || 0,
    format: meta.format || "unknown",
    size: inputBuffer.length,
    hasAlpha: meta.hasAlpha || false,
    density: meta.density,
  };
}

// ─── Generate thumbnail ──────────────────────────────────────────────────────
export async function generateThumbnail(
  inputBuffer: Buffer,
  size: number = 300
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(size, size, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

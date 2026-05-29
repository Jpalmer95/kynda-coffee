/**
 * Square Image Cache — durable image hosting for Kynda Coffee
 *
 * Problem:
 *   Square returns signed, short-lived URLs for catalog images
 *   (typically expire within 24 hours). If we store those URLs directly in
 *   our database, menu items lose their images within a day.
 *
 * Solution:
 *   On each sync, download every referenced Square image and re-host it
 *   in our own Supabase Storage bucket (square-images). We key uploads by
 *   Square image ID, so repeat syncs reuse already-cached files.
 *
 *   pos_items.image_urls stores durable public URLs that never expire,
 *   which makes the menu site resilient and portable across POS providers.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export const BUCKET = "square-images";

/**
 * Ensure the storage bucket exists. Idempotent — safe to call on every sync.
 * Buckets are created lazily, so the very first sync is slightly slower.
 */
export async function ensureImageBucket(): Promise<void> {
  const supabase = supabaseAdmin();
  const { error: listError, data: buckets } = await supabase.storage.listBuckets();

  if (listError) {
    // Non-fatal: log and retry on individual uploads later
    console.warn("[square-images] bucket list failed:", listError.message);
    return;
  }

  const exists = (buckets ?? []).some((b) => b.name === BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
  });

  if (createError && !createError.message.includes("duplicate")) {
    console.warn("[square-images] bucket create failed:", createError.message);
  }
}

/**
 * Detect file extension from a URL or content-type header.
 */
function extensionFrom(
  url: string,
  contentType: string | null
): "jpg" | "png" | "webp" | "gif" {
  const lower = (url + " " + (contentType ?? "")).toLowerCase();
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Download one Square image and cache it in Supabase Storage.
 * Returns the durable public URL, or the original signed URL on failure.
 */
export async function cacheSquareImage(
  squareImageId: string,
  signedUrl: string
): Promise<{ url: string; cached: boolean }> {
  if (!squareImageId || !signedUrl) {
    return { url: signedUrl, cached: false };
  }

  const supabase = supabaseAdmin();

  // 1. Check if we already have this image cached.
  //    We can't know the extension up front — probe the common ones.
  for (const ext of ["jpg", "png", "webp", "gif"] as const) {
    const path = `${squareImageId}.${ext}`;
    const { data } = await supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) continue;

    // We can't cheaply "HEAD" public storage files via Supabase client,
    // so do a lightweight list with prefix filter instead.
    const { data: listed } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1, search: `${squareImageId}.${ext}` });

    if (listed && listed.length > 0) {
      return { url: data.publicUrl, cached: true };
    }
  }

  // 2. Fetch the bytes from Square's signed URL.
  let response: Response;
  try {
    response = await fetch(signedUrl);
    if (!response.ok) {
      console.warn(
        `[square-images] fetch failed ${squareImageId}: ${response.status}`
      );
      return { url: signedUrl, cached: false };
    }
  } catch (err) {
    console.warn(
      `[square-images] network error ${squareImageId}:`,
      String(err)
    );
    return { url: signedUrl, cached: false };
  }

  const contentType = response.headers.get("content-type");
  const ext = extensionFrom(signedUrl, contentType);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const path = `${squareImageId}.${ext}`;

  // 3. Upload (with upsert to silently fix race conditions).
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: contentType || `image/${ext}`,
      cacheControl: "31536000", // 1 year — we own the file
      upsert: true,
    });

  if (uploadError) {
    console.warn(
      `[square-images] upload failed ${squareImageId}:`,
      uploadError.message
    );
    return { url: signedUrl, cached: false };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, cached: false };
}

/**
 * Bulk-cache a set of Square images. Returns a map keyed by imageId.
 * Parallelized with a concurrency cap to respect Square's rate limits.
 */
export async function cacheAllSquareImages(
  images: Record<string, string> // { imageId: signedUrl }
): Promise<Record<string, string>> {
  await ensureImageBucket();

  const entries = Object.entries(images).filter(([, url]) => Boolean(url));
  const out: Record<string, string> = {};

  const CONCURRENCY = 6; // polite toward Square's signed URL CDN
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ([id, signedUrl]) => {
        const { url } = await cacheSquareImage(id, signedUrl);
        return [id, url] as const;
      })
    );
    for (const [id, url] of results) out[id] = url;
  }

  return out;
}

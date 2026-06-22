// GET /api/marketing/images/list
// Lists all marketing images from Supabase Storage

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = supabaseAdmin();

    // List originals and thumbnails
    const { data: originals, error: origError } = await adminClient.storage
      .from("marketing-images")
      .list("originals", { sortBy: { column: "created_at", order: "desc" } });

    const { data: thumbnails } = await adminClient.storage
      .from("marketing-images")
      .list("thumbnails", { sortBy: { column: "created_at", order: "desc" } });

    const { data: processed } = await adminClient.storage
      .from("marketing-images")
      .list("processed", { sortBy: { column: "created_at", order: "desc" } });

    if (origError) {
      // Bucket might not exist yet
      return NextResponse.json({
        success: true,
        images: [],
        note: "marketing-images bucket not found. Run migration first.",
      });
    }

    // Build image list with thumbnail URLs
    const images = (originals || []).map((file) => {
      const thumbName = file.name.replace(/\.[^/.]+$/, ".jpg");
      const hasThumb = thumbnails?.some((t) => t.name === thumbName);
      const thumbPath = hasThumb ? `thumbnails/${thumbName}` : `originals/${file.name}`;

      // Find processed variants for this image
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const variants = (processed || [])
        .filter((p) => p.name.startsWith(`${baseName}__`))
        .map((p) => {
          const { data: urlData } = adminClient.storage
            .from("marketing-images")
            .getPublicUrl(`processed/${p.name}`);
          const presetKey = p.name.replace(`${baseName}__`, "").replace(".jpg", "");
          return { presetKey, path: `processed/${p.name}`, url: urlData.publicUrl };
        });

      const { data: origUrl } = adminClient.storage
        .from("marketing-images")
        .getPublicUrl(`originals/${file.name}`);

      const { data: thumbUrl } = adminClient.storage
        .from("marketing-images")
        .getPublicUrl(thumbPath);

      return {
        name: file.name,
        path: `originals/${file.name}`,
        url: origUrl.publicUrl,
        thumbnail_url: thumbUrl.publicUrl,
        created_at: file.created_at,
        metadata: file.metadata,
        has_variants: variants.length > 0,
        variants,
      };
    });

    return NextResponse.json({
      success: true,
      images,
      total: images.length,
      processed_count: processed?.length || 0,
    });
  } catch (error) {
    console.error("[marketing/images/list] Error:", error);
    return NextResponse.json({ images: [], error: "Failed to list images" }, { status: 500 });
  }
}

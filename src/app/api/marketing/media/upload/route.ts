// POST /api/marketing/media/upload
// Accepts multipart video file upload, stores in Supabase Storage marketing-videos bucket.
// Also handles images as a passthrough (though images typically go through /images/upload).

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Use video (MP4, MOV, WebM) or image (JPEG, PNG, WebP).` },
        { status: 400 }
      );
    }

    // Size limits: 100MB for video, 10MB for image
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large (max ${isVideo ? "100MB" : "10MB"})` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^/.]+$/, "");
    const fileName = `${timestamp}_${sanitizedName}.${ext}`;
    const bucket = isVideo ? "marketing-videos" : "marketing-images";
    const folder = isVideo ? "raw" : "originals";
    const storagePath = `${folder}/${fileName}`;

    const adminClient = supabaseAdmin();

    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = adminClient.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      path: storagePath,
      url: urlData.publicUrl,
      filename: fileName,
      type: isVideo ? "video" : "image",
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error("[marketing/media/upload] Error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

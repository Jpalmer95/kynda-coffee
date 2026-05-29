// POST /api/marketing/images/upload
// Accepts multipart file upload, stores in Supabase Storage marketing-images bucket

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { extractMetadata, generateThumbnail } from "@/lib/marketing/image/processor";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Use JPEG, PNG, WebP, or GIF.` },
        { status: 400 }
      );
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await extractMetadata(buffer);
    const thumbnail = await generateThumbnail(buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^/.]+$/, "");
    const fileName = `${timestamp}_${sanitizedName}.${ext}`;
    const storagePath = `originals/${fileName}`;
    const thumbPath = `thumbnails/${fileName.replace(/\.[^/.]+$/, ".jpg")}`;

    // Upload original + thumbnail to Supabase Storage
    const adminClient = getSupabaseAdmin();

    const { error: uploadError } = await adminClient.storage
      .from("marketing-images")
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

    await adminClient.storage
      .from("marketing-images")
      .upload(thumbPath, thumbnail, {
        contentType: "image/jpeg",
        upsert: false,
      });

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("marketing-images")
      .getPublicUrl(storagePath);

    const { data: thumbUrlData } = adminClient.storage
      .from("marketing-images")
      .getPublicUrl(thumbPath);

    return NextResponse.json({
      success: true,
      path: storagePath,
      thumbnail_path: thumbPath,
      url: urlData.publicUrl,
      thumbnail_url: thumbUrlData.publicUrl,
      filename: fileName,
      metadata,
    });
  } catch (error) {
    console.error("[marketing/images/upload] Error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/marketing/images/process
// Takes an original image path, generates all platform variants with watermark

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { processAllPlatforms, PLATFORM_PRESETS } from "@/lib/marketing/image/processor";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const body = await req.json();
    const { path: originalPath, watermark = true } = body;

    if (!originalPath) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();

    // Download original from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("marketing-images")
      .download(originalPath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Could not download image: ${downloadError?.message || "not found"}` },
        { status: 404 }
      );
    }

    const originalBuffer = Buffer.from(await fileData.arrayBuffer());

    // Process all platform variants
    const processed = await processAllPlatforms(originalBuffer, { watermark });

    // Upload each variant to storage
    const baseName = originalPath.replace(/^originals\//, "").replace(/\.[^/.]+$/, "");
    const variants: Array<{
      presetKey: string;
      label: string;
      platform: string;
      path: string;
      url: string;
      width: number;
      height: number;
    }> = [];

    for (const item of processed) {
      const variantPath = `processed/${baseName}__${item.presetKey}.jpg`;
      const { error: uploadError } = await adminClient.storage
        .from("marketing-images")
        .upload(variantPath, item.buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`Failed to upload variant ${item.presetKey}:`, uploadError.message);
        continue;
      }

      const { data: urlData } = adminClient.storage
        .from("marketing-images")
        .getPublicUrl(variantPath);

      variants.push({
        presetKey: item.presetKey,
        label: item.label,
        platform: item.platform,
        path: variantPath,
        url: urlData.publicUrl,
        width: item.width,
        height: item.height,
      });
    }

    return NextResponse.json({
      success: true,
      original_path: originalPath,
      variants_count: variants.length,
      variants,
      presets_available: PLATFORM_PRESETS.map((p) => ({
        key: p.key,
        label: p.label,
        width: p.width,
        height: p.height,
        platform: p.platform,
      })),
    });
  } catch (error) {
    console.error("[marketing/images/process] Error:", error);
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

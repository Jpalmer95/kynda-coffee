// DELETE /api/marketing/images?path=...
// Removes an image (original + thumbnail + processed variants) from Supabase Storage.

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "path query param is required." }, { status: 400 });
  }

  const adminClient = supabaseAdmin();

  // Derive thumbnail and processed variant paths from the original
  const baseName = path.replace(/^originals\//, "").replace(/\.[^/.]+$/, "");
  const thumbPath = `thumbnails/${baseName}.jpg`;

  // Collect processed variants (files starting with baseName__)
  const { data: processed } = await adminClient.storage
    .from("marketing-images")
    .list("processed");

  const variantPaths: string[] = [];
  if (processed) {
    for (const f of processed) {
      if (f.name.startsWith(`${baseName}__`)) {
        variantPaths.push(`processed/${f.name}`);
      }
    }
  }

  const pathsToRemove = [path, thumbPath, ...variantPaths];
  const { error } = await adminClient.storage.from("marketing-images").remove(pathsToRemove);

  if (error) {
    console.error("[marketing/images] delete error", error);
    return NextResponse.json({ error: "Failed to delete image." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removed: pathsToRemove.length });
}

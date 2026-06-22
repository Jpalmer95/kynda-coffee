// GET /api/marketing/media/list
// Lists raw media (images + videos) from Supabase Storage.

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = getSupabaseAdmin();
  const type = new URL(req.url).searchParams.get("type") || "all";

  const results: Array<Record<string, unknown>> = [];

  try {
    if (type === "all" || type === "image") {
      const { data: imageFiles, error: imgErr } = await adminClient.storage
        .from("marketing-images")
        .list("originals", { limit: 50, sortBy: { column: "created_at", order: "desc" } });

      if (!imgErr && imageFiles) {
        for (const f of imageFiles) {
          if (f.id === null) continue; // skip folders
          const { data: urlData } = adminClient.storage
            .from("marketing-images")
            .getPublicUrl(`originals/${f.name}`);
          results.push({
            name: f.name,
            url: urlData.publicUrl,
            type: "image",
            size: f.metadata?.size ?? null,
            updated_at: f.updated_at ?? null,
          });
        }
      }
    }

    if (type === "all" || type === "video") {
      const { data: videoFiles, error: vidErr } = await adminClient.storage
        .from("marketing-videos")
        .list("raw", { limit: 50, sortBy: { column: "created_at", order: "desc" } });

      if (!vidErr && videoFiles) {
        for (const f of videoFiles) {
          if (f.id === null) continue;
          const { data: urlData } = adminClient.storage
            .from("marketing-videos")
            .getPublicUrl(`raw/${f.name}`);
          results.push({
            name: f.name,
            url: urlData.publicUrl,
            type: "video",
            size: f.metadata?.size ?? null,
            updated_at: f.updated_at ?? null,
          });
        }
      }
    }

    return NextResponse.json({ media: results, count: results.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list media", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

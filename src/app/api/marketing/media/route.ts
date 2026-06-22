// DELETE /api/marketing/media?path=...&type=image|video
// Removes a file from Supabase Storage (marketing-images or marketing-videos bucket).

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const type = searchParams.get("type") || "image";

  if (!path) {
    return NextResponse.json({ error: "path query param is required." }, { status: 400 });
  }

  const bucket = type === "video" ? "marketing-videos" : "marketing-images";
  const adminClient = supabaseAdmin();

  const { error } = await adminClient.storage.from(bucket).remove([path]);

  if (error) {
    console.error("[marketing/media] delete error", error);
    return NextResponse.json({ error: "Failed to delete file." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

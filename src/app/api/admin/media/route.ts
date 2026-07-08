import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TAG_OPTIONS = ["product", "event", "shop", "food", "drink", "team", "seasonal"];

/**
 * GET /api/admin/media
 *   - ?status=pending|approved|rejected → filter by status
 *   - ?tag=food → filter by tag
 *   - (no params) → all uploads (most recent 100)
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");

  let query = supabaseAdmin()
    .from("team_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch uploader names
  const uploaderIds = [...new Set((data ?? []).map((u: any) => u.uploaded_by))];
  let uploaderMap: Record<string, string> = {};
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabaseAdmin()
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    for (const p of profiles ?? []) {
      uploaderMap[p.id] = p.full_name || "Team Member";
    }
  }

  return NextResponse.json({
    uploads: (data ?? []).map((u: any) => ({
      ...u,
      uploader_name: uploaderMap[u.uploaded_by] ?? "Team Member",
    })),
    tag_options: TAG_OPTIONS,
  });
}

/**
 * POST /api/admin/media
 * Body: { action: "upload", file_name, mime_type, file_size_bytes, media_type, tags? } → get upload URL
 * Body: { action: "confirm", upload_id, storage_path, public_url } → confirm upload completed
 * Body: { action: "approve", upload_id } → approve (manager+)
 * Body: { action: "reject", upload_id, notes? } → reject (manager+)
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action ?? "upload";

    if (action === "approve" || action === "reject") {
      const minTeam = await requireTier(req, "manager");
      if (!minTeam) return NextResponse.json({ error: "Manager+ required" }, { status: 403 });

      const updates: any = {
        status: action === "approve" ? "approved" : "rejected",
        approved_by: team.user.id,
        approved_at: new Date().toISOString(),
      };
      if (body.notes) updates.notes = body.notes;

      const { data, error } = await supabaseAdmin()
        .from("team_uploads")
        .update(updates)
        .eq("id", body.upload_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ upload: data });
    }

    if (action === "confirm") {
      const { data, error } = await supabaseAdmin()
        .from("team_uploads")
        .update({
          storage_path: body.storage_path,
          public_url: body.public_url,
          file_size_bytes: body.file_size_bytes ?? null,
        })
        .eq("id", body.upload_id)
        .eq("uploaded_by", team.user.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ upload: data });
    }

    // action === "upload" — create the record and return a signed upload URL
    const fileName = (body.file_name ?? "upload").trim();
    const mimeType = body.mime_type ?? "image/jpeg";
    const mediaType = body.media_type ?? (mimeType.startsWith("video/") ? "video" : "image");
    const bucket = mediaType === "video" ? "marketing-videos" : "marketing-images";
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: string) => TAG_OPTIONS.includes(t)) : [];

    // Create the upload record first
    const { data: upload, error: insertErr } = await supabaseAdmin()
      .from("team_uploads")
      .insert({
        uploaded_by: team.user.id,
        storage_path: "",  // will be updated on confirm
        public_url: "",    // will be updated on confirm
        media_type: mediaType,
        file_name: fileName,
        mime_type: mimeType,
        file_size_bytes: body.file_size_bytes ?? null,
        tags,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Generate the storage path
    const ext = fileName.includes(".") ? fileName.split(".").pop() : (mediaType === "video" ? "mp4" : "jpg");
    const storagePath = `team/${new Date().toISOString().slice(0, 10)}/${upload.id}.${ext}`;

    // Create a signed upload URL
    const { data: signedData, error: signedErr } = await supabaseAdmin()
      .storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (signedErr) throw signedErr;

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;

    return NextResponse.json({
      upload_id: upload.id,
      bucket,
      storage_path: storagePath,
      public_url: publicUrl,
      signed_url: signedData.signedUrl,
      token: signedData.token,
    });
  } catch (error) {
    console.error("Media upload POST error", error);
    return NextResponse.json(
      { error: "Failed to process media upload", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/media?id=<upload_id>
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Check ownership or manager+
  const { data: upload } = await supabaseAdmin()
    .from("team_uploads")
    .select("uploaded_by, storage_path, media_type")
    .eq("id", id)
    .maybeSingle();

  if (!upload) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  const isOwner = upload.uploaded_by === team.user.id;
  const isManager = (await requireTier(req, "manager")) !== null;

  if (!isOwner && !isManager) {
    return NextResponse.json({ error: "Can only delete your own uploads" }, { status: 403 });
  }

  // Delete from storage if path exists
  if (upload.storage_path) {
    const bucket = upload.media_type === "video" ? "marketing-videos" : "marketing-images";
    await supabaseAdmin().storage.from(bucket).remove([upload.storage_path]);
  }

  const { error } = await supabaseAdmin()
    .from("team_uploads")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

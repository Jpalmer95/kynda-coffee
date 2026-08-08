import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * POST /api/chat/upload — upload image or video for team chat.
 * Multipart form: file=<blob>
 * Returns { url, media_type } for use in chat_messages insert.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const mime = file.type;
    const isImage = IMAGE_TYPES.includes(mime);
    const isVideo = VIDEO_TYPES.includes(mime);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mime}. Allowed: ${[...IMAGE_TYPES, ...VIDEO_TYPES].join(", ")}` },
        { status: 400 }
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${isVideo ? "50MB" : "10MB"}.` },
        { status: 400 }
      );
    }

    const mediaType = isImage ? "image" : "video";
    const ext = mime.split("/")[1]?.replace("quicktime", "mov") ?? "bin";
    const fileName = `${team.user.id}/${new Date().toISOString().split("T")[0]}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabaseAdmin()
      .storage
      .from("team-chat")
      .upload(fileName, arrayBuffer, {
        contentType: mime,
        cacheControl: "3600",
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin()
      .storage
      .from("team-chat")
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: urlData.publicUrl,
      media_type: mediaType,
      path: fileName,
    });
  } catch (error) {
    console.error("Chat upload error", error);
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "text/plain",
];

/**
 * POST /api/admin/onboarding/upload
 * Multipart form: file=<blob>
 * Uploads an onboarding document (handbook, i-9, w-4, training packet) to the
 * 'onboarding' Storage bucket. Returns { storage_path, file_type } so the admin
 * UI can attach it to an onboarding_documents row.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const mime = file.type;
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mime}. Allowed: PDF, DOCX, DOC, TXT.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 25MB." }, { status: 400 });
    }

    const ext = mime === "application/pdf" ? "pdf" : mime.includes("wordprocessingml") ? "docx" : mime === "application/msword" ? "doc" : "txt";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabaseAdmin()
      .storage
      .from("onboarding")
      .upload(fileName, new Uint8Array(arrayBuffer), {
        contentType: mime,
        upsert: false,
      });

    if (error || !data) {
      console.error("Onboarding upload error", error);
      return NextResponse.json({ error: `Upload failed: ${error?.message ?? "unknown"}` }, { status: 500 });
    }

    // Get a signed public URL for display (bucket is private)
    const { data: signed } = await supabaseAdmin()
      .storage
      .from("onboarding")
      .createSignedUrl(data.path, 3600);

    return NextResponse.json({
      storage_path: data.path,
      file_type: ext,
      file_name: file.name,
      url: signed?.signedUrl ?? null,
    });
  } catch (error) {
    console.error("Onboarding upload error", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

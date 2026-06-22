import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateDesign as falGenerate } from "@/lib/fal/client";

export const dynamic = "force-dynamic";
export const maxDuration = 150; // AI generation can take a while

/**
 * Admin curated studio designs.
 *
 * GET    /api/admin/studio-designs            — list ALL (incl. inactive)
 * POST   /api/admin/studio-designs            — create
 *   Body (upload mode):   { name, style, image_data (dataURL) | image_url, ... }
 *   Body (generate mode): { name, style, generate: true, prompt, ... }
 * PATCH  /api/admin/studio-designs            — update { id, ...fields }
 * DELETE /api/admin/studio-designs?id=<uuid>  — delete
 */

async function requireAdmin(req: NextRequest) {
  const team = await requireTier(req, "manager");
  return team?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("studio_designs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ designs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      name,
      description = "",
      style = "logo",
      product_id = null,
      trending = false,
      seasonal = false,
      show_on_shop = true,
      sort_order = 0,
      image_data, // dataURL upload
      image_url,  // direct URL
      generate,   // boolean: AI-generate instead
      prompt,
    } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const db = supabaseAdmin();
    let finalImageUrl: string | null = null;
    let usedPrompt: string | null = null;

    if (generate) {
      // ── AI generate via FAL, then re-host in Supabase Storage ──
      if (!prompt) return NextResponse.json({ error: "prompt required for generate" }, { status: 400 });
      if (!process.env.FAL_KEY) {
        return NextResponse.json({ error: "FAL_KEY not configured on server" }, { status: 500 });
      }
      const result = await falGenerate(prompt, {});
      const img = result.images?.[0];
      if (!img?.url) return NextResponse.json({ error: "Generation returned no image" }, { status: 502 });

      // Download from FAL (URLs expire!) and re-host
      const dl = await fetch(img.url);
      if (!dl.ok) return NextResponse.json({ error: "Failed to download generated image" }, { status: 502 });
      const buf = Buffer.from(await dl.arrayBuffer());
      const path = `gen-${Date.now()}.png`;
      const { error: upErr } = await db.storage
        .from("studio-designs")
        .upload(path, buf, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
      if (upErr) return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 });
      finalImageUrl = db.storage.from("studio-designs").getPublicUrl(path).data.publicUrl;
      usedPrompt = prompt;
    } else if (image_data?.startsWith("data:image/")) {
      // ── Upload mode: dataURL → Storage ──
      const m = image_data.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
      if (!m) return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
      const contentType = m[1];
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 413 });
      }
      const ext = contentType.split("/")[1].replace("+xml", "");
      const path = `upload-${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage
        .from("studio-designs")
        .upload(path, buf, { contentType, upsert: true, cacheControl: "31536000" });
      if (upErr) return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 });
      finalImageUrl = db.storage.from("studio-designs").getPublicUrl(path).data.publicUrl;
    } else if (image_url) {
      finalImageUrl = image_url;
    }

    if (!finalImageUrl) {
      return NextResponse.json({ error: "Provide image_data, image_url, or generate+prompt" }, { status: 400 });
    }

    const { data, error } = await db
      .from("studio_designs")
      .insert({
        name,
        description,
        image_url: finalImageUrl,
        style,
        product_id,
        trending,
        seasonal,
        show_on_shop,
        sort_order,
        prompt: usedPrompt,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ design: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const allowed = [
      "name", "description", "style", "product_id", "trending",
      "seasonal", "is_active", "show_on_shop", "sort_order",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (k in fields) updates[k] = fields[k];
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("studio_designs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ design: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("studio_designs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

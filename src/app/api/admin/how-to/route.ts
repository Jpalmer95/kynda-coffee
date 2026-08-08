import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CATEGORIES = ["equipment", "cold-brew", "cleaning", "maintenance", "safety", "opening", "closing", "other"];

export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin()
      .from("howto_guides")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ guides: data ?? [], categories: CATEGORIES });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load guides" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (body.category && !CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("howto_guides")
      .insert({
        title,
        description: body.description ?? null,
        category: body.category ?? "equipment",
        content: body.content ?? "",
        image_url: body.image_url ?? null,
        video_url: body.video_url ?? null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
        created_by: team.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ guide: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create guide" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of ["title", "description", "category", "content", "image_url", "video_url", "sort_order", "is_active"]) {
      if (f in body) payload[f] = body[f];
    }

    const { data, error } = await supabaseAdmin()
      .from("howto_guides")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ guide: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update guide" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("howto_guides")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

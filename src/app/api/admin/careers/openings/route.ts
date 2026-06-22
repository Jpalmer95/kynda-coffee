// /api/admin/careers/openings — CRUD for job openings (manager+)
// GET    /api/admin/careers/openings        → list all openings (incl. inactive)
// POST   /api/admin/careers/openings        → create opening
// PATCH  /api/admin/careers/openings        → update opening (id + fields)
// DELETE /api/admin/careers/openings?id=...  → delete opening

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** GET — list all openings including inactive. */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("job_openings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/careers/openings] list error", error);
    return NextResponse.json({ error: "Failed to load openings." }, { status: 500 });
  }
  return NextResponse.json({ openings: data ?? [] });
}

/** POST — create a new opening. */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const slug = body.slug ? slugify(String(body.slug)) : slugify(title);
    const department = String(body.department ?? "General").trim();
    const location = String(body.location ?? "Horseshoe Bay, TX").trim();
    const type = String(body.type ?? "Full-time").trim();
    const description = String(body.description ?? "").trim();
    const requirements: string[] = Array.isArray(body.requirements)
      ? body.requirements.map((r: unknown) => String(r).trim()).filter(Boolean)
      : [];
    const compensation = body.compensation ? String(body.compensation).trim() : null;
    const is_active = body.is_active !== false;

    if (!["Full-time", "Part-time", "Seasonal", "Contract"].includes(type)) {
      return NextResponse.json({ error: "Invalid employment type." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("job_openings")
      .insert({ title, slug, department, location, type, description, requirements, compensation, is_active })
      .select()
      .single();

    if (error) {
      console.error("[admin/careers/openings] create error", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "An opening with that slug already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create opening." }, { status: 500 });
    }
    return NextResponse.json({ opening: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

/** PATCH — update an existing opening. */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.slug !== undefined) updates.slug = slugify(String(body.slug));
    if (body.department !== undefined) updates.department = String(body.department).trim();
    if (body.location !== undefined) updates.location = String(body.location).trim();
    if (body.type !== undefined) {
      const type = String(body.type).trim();
      if (!["Full-time", "Part-time", "Seasonal", "Contract"].includes(type)) {
        return NextResponse.json({ error: "Invalid employment type." }, { status: 400 });
      }
      updates.type = type;
    }
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.requirements !== undefined) {
      updates.requirements = Array.isArray(body.requirements)
        ? body.requirements.map((r: unknown) => String(r).trim()).filter(Boolean)
        : [];
    }
    if (body.compensation !== undefined) {
      updates.compensation = body.compensation ? String(body.compensation).trim() : null;
    }
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    const { data, error } = await supabaseAdmin()
      .from("job_openings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[admin/careers/openings] update error", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update opening." }, { status: 500 });
    }
    return NextResponse.json({ opening: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

/** DELETE — remove an opening. */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param is required." }, { status: 400 });

  const { error } = await supabaseAdmin().from("job_openings").delete().eq("id", id);
  if (error) {
    console.error("[admin/careers/openings] delete error", error);
    return NextResponse.json({ error: "Failed to delete opening." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

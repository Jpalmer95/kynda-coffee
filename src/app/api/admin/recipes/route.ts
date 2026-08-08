import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CATEGORIES = ["espresso", "cold-brew", "tea", "smoothie", "food", "pastry", "seasonal"];

/**
 * GET /api/admin/recipes — all recipes
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin()
      .from("recipes")
      .select("*")
      .order("category")
      .order("name");

    if (error) throw error;
    return NextResponse.json({ recipes: data ?? [], categories: CATEGORIES });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load recipes" }, { status: 500 });
  }
}

/**
 * POST — create a recipe
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (body.category && !CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("recipes")
      .insert({
        name,
        category: body.category ?? "food",
        ingredients: body.ingredients ?? [],
        steps: body.steps ?? [],
        prep_time_minutes: body.prep_time_minutes ?? 5,
        servings: body.servings ?? 1,
        notes: body.notes ?? null,
        image_url: body.image_url ?? null,
        created_by: team.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ recipe: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 });
  }
}

/**
 * PATCH — update a recipe
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of ["name", "category", "ingredients", "steps", "prep_time_minutes", "servings", "notes", "image_url"]) {
      if (f in body) payload[f] = body[f];
    }

    const { data, error } = await supabaseAdmin()
      .from("recipes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ recipe: data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
}

/**
 * DELETE — delete a recipe
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("recipes")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

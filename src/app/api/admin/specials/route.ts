import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SELECT =
  "id, title, subtitle, description, provider_item_id, provider_variation_id, image_url, price_cents, compare_at_cents, badge, cta_label, starts_at, ends_at, is_active, sort_order, marketing_generated, created_at, updated_at";

function normNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}
function normStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** GET — list all specials (admin view, includes inactive/scheduled). */
export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("specials")
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ specials: data ?? [] });
}

/** POST — create or update a special (upsert when id provided). */
export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = normStr(body.title);
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const row: Record<string, unknown> = {
      title,
      subtitle: normStr(body.subtitle),
      description: normStr(body.description),
      provider_item_id: normStr(body.provider_item_id),
      provider_variation_id: normStr(body.provider_variation_id),
      image_url: normStr(body.image_url),
      price_cents: normNum(body.price_cents),
      compare_at_cents: normNum(body.compare_at_cents),
      badge: normStr(body.badge),
      cta_label: normStr(body.cta_label) ?? "Order now",
      starts_at: normStr(body.starts_at),
      ends_at: normStr(body.ends_at),
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
      sort_order: normNum(body.sort_order) ?? 0,
      updated_at: new Date().toISOString(),
    };

    const id = normStr(body.id);
    if (id) {
      const { data, error } = await supabaseAdmin()
        .from("specials")
        .update(row)
        .eq("id", id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return NextResponse.json({ special: data });
    }

    row.created_by = user.id;
    const { data, error } = await supabaseAdmin()
      .from("specials")
      .insert(row)
      .select(SELECT)
      .single();
    if (error) throw error;
    return NextResponse.json({ special: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save special", details: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

/** DELETE — remove a special by ?id=. */
export async function DELETE(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin().from("specials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

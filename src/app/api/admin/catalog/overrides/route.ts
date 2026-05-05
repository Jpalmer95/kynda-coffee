import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BOOLEAN_FIELDS = [
  "available_online",
  "available_pickup",
  "available_delivery",
  "available_shipping",
  "available_qr",
  "is_hidden",
  "is_featured",
] as const;

const TEXT_FIELDS = [
  "display_name",
  "display_description",
  "category_name",
  "item_type",
  "menu_metrics_recipe_id",
  "admin_notes",
] as const;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBody(body: any, userId: string) {
  const provider = normalizeString(body.provider) ?? "square";
  const providerItemId = normalizeString(body.provider_item_id);

  if (!providerItemId) {
    throw new Error("provider_item_id is required");
  }

  const payload: Record<string, unknown> = {
    provider,
    provider_item_id: providerItemId,
    provider_variation_id: normalizeString(body.provider_variation_id),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  for (const field of TEXT_FIELDS) {
    if (field in body) payload[field] = normalizeString(body[field]);
  }

  if ("image_urls" in body) {
    payload.image_urls = Array.isArray(body.image_urls)
      ? body.image_urls.map(normalizeString).filter(Boolean)
      : null;
  }

  for (const field of BOOLEAN_FIELDS) {
    if (field in body) {
      payload[field] = body[field] === null ? null : Boolean(body[field]);
    }
  }

  if ("sort_order" in body) {
    payload.sort_order = body.sort_order === null || body.sort_order === "" ? null : Number(body.sort_order);
  }

  return payload;
}

export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payload = normalizeBody(body, user.id);
    payload.created_by = user.id;

    const { data, error } = await supabaseAdmin()
      .from("catalog_overrides")
      .upsert(payload, { onConflict: "provider,provider_item_id,provider_variation_id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ override: data });
  } catch (error) {
    console.error("Catalog override upsert error", error);
    return NextResponse.json(
      {
        error: "Failed to save catalog override",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") ?? "square";
  const providerItemId = searchParams.get("provider_item_id");
  const providerVariationId = searchParams.get("provider_variation_id");

  if (!providerItemId) {
    return NextResponse.json({ error: "provider_item_id is required" }, { status: 400 });
  }

  let query = supabaseAdmin()
    .from("catalog_overrides")
    .delete()
    .eq("provider", provider)
    .eq("provider_item_id", providerItemId);

  query = providerVariationId
    ? query.eq("provider_variation_id", providerVariationId)
    : query.is("provider_variation_id", null);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

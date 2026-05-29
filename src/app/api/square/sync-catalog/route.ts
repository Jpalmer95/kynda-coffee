import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchInventoryCounts, fetchSquareCatalogSnapshot, rawForJsonb } from "@/lib/square/catalog";
import { toNumber, type SquareObjectLike } from "@/lib/square/catalog-transform";
import { cacheAllSquareImages } from "@/lib/square/image-cache";

const PROVIDER = "square";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

function objectVersion(obj: SquareObjectLike): number {
  return toNumber(obj.version, 0);
}

async function upsertRawObjects(supabase: ReturnType<typeof getSupabase>, objects: SquareObjectLike[]) {
  if (objects.length === 0) return { synced: 0, errors: [] as string[] };

  const rows = objects
    .filter((obj) => obj.id && obj.type)
    .map((obj) => ({
      provider: PROVIDER,
      provider_object_id: obj.id!,
      object_type: obj.type!,
      version: objectVersion(obj),
      raw: rawForJsonb(obj),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("pos_raw_objects")
    .upsert(rows as any, { onConflict: "provider,provider_object_id" });

  return { synced: error ? 0 : rows.length, errors: error ? [error.message] : [] };
}

async function upsertCategories(supabase: ReturnType<typeof getSupabase>, objects: SquareObjectLike[]) {
  const rows = objects
    .filter((obj) => obj.type === "CATEGORY" && obj.id && obj.categoryData?.name)
    .map((obj) => ({
      provider: PROVIDER,
      provider_category_id: obj.id!,
      name: obj.categoryData!.name!,
      ordinal: toNumber(obj.categoryData?.ordinal, 0),
      is_active: true,
      raw: rawForJsonb(obj),
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return { synced: 0, errors: [] as string[] };

  const { error } = await supabase
    .from("pos_categories")
    .upsert(rows as any, { onConflict: "provider,provider_category_id" });

  return { synced: error ? 0 : rows.length, errors: error ? [error.message] : [] };
}

async function upsertTaxes(supabase: ReturnType<typeof getSupabase>, objects: SquareObjectLike[]) {
  const rows = objects
    .filter((obj) => obj.type === "TAX" && obj.id && obj.taxData?.name)
    .map((obj) => ({
      provider: PROVIDER,
      provider_tax_id: obj.id!,
      name: obj.taxData!.name!,
      percentage: obj.taxData?.percentage,
      calculation_phase: obj.taxData?.calculationPhase,
      inclusion_type: obj.taxData?.inclusionType,
      applies_to_custom_amounts: obj.taxData?.appliesToCustomAmounts,
      enabled: obj.taxData?.enabled !== false,
      raw: rawForJsonb(obj),
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return { synced: 0, errors: [] as string[] };

  const { error } = await supabase
    .from("pos_taxes")
    .upsert(rows as any, { onConflict: "provider,provider_tax_id" });

  return { synced: error ? 0 : rows.length, errors: error ? [error.message] : [] };
}

async function upsertModifiers(supabase: ReturnType<typeof getSupabase>, objects: SquareObjectLike[]) {
  const listRows = objects
    .filter((obj) => obj.type === "MODIFIER_LIST" && obj.id && obj.modifierListData?.name)
    .map((obj) => ({
      provider: PROVIDER,
      provider_modifier_list_id: obj.id!,
      name: obj.modifierListData!.name!,
      selection_type: obj.modifierListData?.selectionType,
      raw: rawForJsonb(obj),
      synced_at: new Date().toISOString(),
    }));

  const modifierRows: any[] = [];
  for (const obj of objects) {
    if (obj.type === "MODIFIER" && obj.id && obj.modifierData?.name) {
      modifierRows.push({
        provider: PROVIDER,
        provider_modifier_id: obj.id,
        provider_modifier_list_id: obj.modifierData.modifierListId || "unknown",
        name: obj.modifierData.name,
        price_cents: toNumber(obj.modifierData.priceMoney?.amount, 0),
        currency: obj.modifierData.priceMoney?.currency || "USD",
        ordinal: toNumber(obj.modifierData.ordinal, 0),
        on_by_default: obj.modifierData.onByDefault || false,
        raw: rawForJsonb(obj),
        synced_at: new Date().toISOString(),
      });
    }

    for (const modifier of obj.modifierListData?.modifiers || []) {
      if (!modifier.id || !modifier.modifierData?.name) continue;
      modifierRows.push({
        provider: PROVIDER,
        provider_modifier_id: modifier.id,
        provider_modifier_list_id: obj.id!,
        name: modifier.modifierData.name,
        price_cents: toNumber(modifier.modifierData.priceMoney?.amount, 0),
        currency: modifier.modifierData.priceMoney?.currency || "USD",
        ordinal: toNumber(modifier.modifierData.ordinal, 0),
        on_by_default: modifier.modifierData.onByDefault || false,
        raw: rawForJsonb(modifier),
        synced_at: new Date().toISOString(),
      });
    }
  }

  const errors: string[] = [];
  if (listRows.length > 0) {
    const { error } = await supabase
      .from("pos_modifier_lists")
      .upsert(listRows as any, { onConflict: "provider,provider_modifier_list_id" });
    if (error) errors.push(error.message);
  }

  if (modifierRows.length > 0) {
    const { error } = await supabase
      .from("pos_modifiers")
      .upsert(modifierRows as any, { onConflict: "provider,provider_modifier_id" });
    if (error) errors.push(error.message);
  }

  return { syncedLists: errors.length ? 0 : listRows.length, syncedModifiers: errors.length ? 0 : modifierRows.length, errors };
}

export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => ({}));
    const supabase = getSupabase();

    const { data: syncLog } = await supabase
      .from("square_sync_log")
      .insert({ sync_type: "catalog", started_at: new Date().toISOString() })
      .select()
      .single();

    const { data: posRun } = await supabase
      .from("pos_sync_runs")
      .insert({ provider: PROVIDER, sync_type: "catalog", started_at: new Date().toISOString() })
      .select()
      .single();

    const snapshot = await fetchSquareCatalogSnapshot();
    const variationIds = snapshot.items.map((i) => i.squareVariationId);
    const inventoryCounts = await fetchInventoryCounts(variationIds);

    // Cache every Square image into our own durable Supabase Storage bucket
    // so URLs never rot. Square's signed URLs expire within 24 hours; ours
    // live forever. This is safe to re-run — already-cached files are skipped.
    let durableImages: Record<string, string> = {};
    let imagesCached = 0;
    try {
      durableImages = await cacheAllSquareImages(snapshot.images);
      imagesCached = Object.keys(durableImages).length;
    } catch (err) {
      console.warn("[square-sync] image cache step failed (non-fatal):", String(err));
    }

    const errors: string[] = [];
    const rawResult = await upsertRawObjects(supabase, snapshot.objects);
    errors.push(...rawResult.errors);
    const categoryResult = await upsertCategories(supabase, snapshot.objects);
    errors.push(...categoryResult.errors);
    const taxResult = await upsertTaxes(supabase, snapshot.objects);
    errors.push(...taxResult.errors);
    const modifierResult = await upsertModifiers(supabase, snapshot.objects);
    errors.push(...modifierResult.errors);

    let successCount = 0;
    let failCount = 0;

    // Build per-item durable image URL lists from the cached map.
    // Key on squareImageIds so every variation of the same item gets the same URLs.
    const itemDurableImageUrls = snapshot.items.reduce<Record<string, string[]>>((acc, item) => {
      if (item.squareImageIds.length === 0) return acc;
      acc[`${item.squareItemId}:${item.squareVariationId}`] = item.squareImageIds
        .map((id) => durableImages[id])
        .filter((url): url is string => Boolean(url));
      return acc;
    }, {});

    for (const item of snapshot.items) {
      const availableShipping = item.itemType === "merch" || item.itemType === "retail" || item.itemType === "gift_card";
      const availableQr = item.cafeOrRetail === "cafe";
      const availableDelivery = item.itemType === "menu";
      const durableUrls =
        itemDurableImageUrls[`${item.squareItemId}:${item.squareVariationId}`] ??
        (item.imageUrl ? [item.imageUrl] : []);

      const { error: squareError } = await supabase
        .from("square_catalog_items")
        .upsert({
          square_item_id: item.squareItemId,
          square_variation_id: item.squareVariationId,
          name: item.variationName === "Regular" ? item.name : `${item.name} — ${item.variationName}`,
          description: item.description,
          category: item.category,
          category_id: item.categoryId,
          variation_name: item.variationName,
          price_cents: item.priceCents,
          currency: item.currency,
          track_inventory: item.trackInventory,
          quantity_available: inventoryCounts[item.squareVariationId] ?? 0,
          item_type: item.cafeOrRetail,
          available_online: item.isActive,
          available_pickup: item.isActive && item.cafeOrRetail === "cafe",
          available_delivery: item.isActive && availableDelivery,
          available_shipping: item.isActive && availableShipping,
          available_qr: item.isActive && availableQr,
          image_url: durableUrls[0] ?? item.imageUrl,
          square_image_ids: item.squareImageIds,
          modifier_list_ids: item.modifierListIds,
          tax_ids: item.taxIds,
          provider_raw: rawForJsonb(item.raw),
          square_version: Number(item.squareVersion),
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: "square_item_id",
        });

      const { error: posItemError } = await supabase
        .from("pos_items")
        .upsert({
          provider: PROVIDER,
          provider_item_id: item.squareItemId,
          name: item.name,
          description: item.description,
          provider_category_id: item.categoryId,
          category_name: item.category,
          item_type: item.itemType,
          is_active: item.isActive,
          available_online: item.isActive,
          available_pickup: item.isActive && item.cafeOrRetail === "cafe",
          available_delivery: item.isActive && availableDelivery,
          available_shipping: item.isActive && availableShipping,
          available_qr: item.isActive && availableQr,
          image_urls: durableUrls,
          modifier_list_ids: item.modifierListIds,
          tax_ids: item.taxIds,
          raw: rawForJsonb(item.raw),
          synced_at: new Date().toISOString(),
        } as any, { onConflict: "provider,provider_item_id" });

      const { error: variationError } = await supabase
        .from("pos_item_variations")
        .upsert({
          provider: PROVIDER,
          provider_item_id: item.squareItemId,
          provider_variation_id: item.squareVariationId,
          name: item.variationName,
          sku: item.variationRaw?.itemVariationData?.sku ?? null,
          ordinal: toNumber(item.variationRaw?.itemVariationData?.ordinal, 0),
          price_cents: item.priceCents,
          currency: item.currency,
          pricing_type: item.variationRaw?.itemVariationData?.pricingType ?? null,
          track_inventory: item.trackInventory,
          sellable: item.variationRaw?.itemVariationData?.sellable !== false,
          stockable: item.variationRaw?.itemVariationData?.stockable !== false,
          raw: rawForJsonb({
            ...(item.variationRaw ?? {}),
            kyndaInventory: {
              quantity_available: inventoryCounts[item.squareVariationId] ?? null,
              synced_at: new Date().toISOString(),
            },
          }),
          synced_at: new Date().toISOString(),
        } as any, { onConflict: "provider,provider_variation_id" });

      const itemErrors = [squareError, posItemError, variationError].filter(Boolean).map((e) => e!.message);
      if (itemErrors.length) {
        errors.push(`${item.name}: ${itemErrors.join("; ")}`);
        failCount++;
      } else {
        successCount++;
      }
    }

    await supabase
      .from("square_sync_log")
      .update({
        items_synced: successCount,
        items_failed: failCount,
        error_message: errors.length ? errors.slice(0, 10).join(" | ") : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog?.id);

    await supabase
      .from("pos_sync_runs")
      .update({
        raw_objects_synced: rawResult.synced,
        items_synced: successCount,
        variations_synced: successCount,
        modifiers_synced: modifierResult.syncedModifiers,
        taxes_synced: taxResult.synced,
        errors: errors,
        completed_at: new Date().toISOString(),
      } as any)
      .eq("id", posRun?.id);

    return NextResponse.json({
      success: errors.length === 0,
      synced: successCount,
      failed: failCount,
      total: snapshot.items.length,
      images: { total: imagesCached, cached: Object.keys(durableImages).length },
      rawObjects: snapshot.objects.length,
      categories: Object.keys(snapshot.categories).length,
      modifiers: modifierResult.syncedModifiers,
      taxes: taxResult.synced,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("Catalog sync error:", err);
    return NextResponse.json(
      { error: "Sync failed", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("square_sync_log")
    .select("*")
    .eq("sync_type", "catalog")
    .order("started_at", { ascending: false })
    .limit(5);

  const { data: counts } = await supabase.rpc("get_item_type_counts");
  const { data: posCounts } = await supabase
    .from("pos_items")
    .select("item_type", { count: "exact" });

  return NextResponse.json({
    recentSyncs: data || [],
    itemCounts: counts || [],
    posItemCount: posCounts?.length ?? 0,
  });
}

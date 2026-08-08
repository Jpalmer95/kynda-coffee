import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { getPosCatalog } from "@/lib/pos/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InventoryRow = {
  id: string;
  provider: string;
  providerItemId: string;
  providerVariationId: string;
  name: string;
  variationName: string;
  sku: string | null;
  category: "Cafe" | "Merch";
  stock: number | null;
  threshold: number;
  trackInventory: boolean;
  source: "Square" | "Online";
  lastUpdated: string | null;
};

function stockFromRaw(raw: any): number | null {
  const value = raw?.kyndaInventory?.quantity_available;
  return typeof value === "number" ? value : null;
}

function thresholdFor(categoryName: string, itemType: string) {
  const text = `${categoryName} ${itemType}`.toLowerCase();
  if (text.includes("merch") || text.includes("retail")) return 5;
  if (text.includes("coffee") || text.includes("beans")) return 10;
  return 8;
}

export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const catalog = await getPosCatalog({ channel: "all", includeModifiers: false, limit: 500 });

    // Load saved threshold overrides (keyed by source + provider variation id).
    const { data: savedThresholds } = await supabaseAdmin()
      .from("inventory_thresholds")
      .select("source, provider_variation_id, threshold");
    const thresholdMap = new Map<string, number>();
    for (const t of savedThresholds ?? []) {
      thresholdMap.set(`${t.source}:${t.provider_variation_id}`, Number(t.threshold));
    }
    const thresholdForRow = (source: "square" | "online", variationId: string, fallback: number) =>
      thresholdMap.get(`${source}:${variationId}`) ?? fallback;

    const squareRows: InventoryRow[] = catalog.items.flatMap((item) =>
      item.variations.map((variation) => ({
        id: `${item.provider}:${variation.providerVariationId}`,
        provider: item.provider,
        providerItemId: item.providerItemId,
        providerVariationId: variation.providerVariationId,
        name: item.name,
        variationName: variation.name,
        sku: variation.sku,
        category: item.itemType === "menu" || item.itemType === "service" ? "Cafe" : "Merch",
        stock: variation.trackInventory ? stockFromRaw(variation.raw) : null,
        threshold: thresholdForRow("square", variation.providerVariationId, thresholdFor(item.categoryName, item.itemType)),
        trackInventory: variation.trackInventory,
        source: "Square",
        lastUpdated: variation.raw?.kyndaInventory?.synced_at ?? variation.syncedAt ?? null,
      }))
    );

    const { data: onlineProducts, error } = await supabaseAdmin()
      .from("products")
      .select("id, name, category, inventory_count, track_inventory, updated_at, source")
      .neq("source", "square")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const onlineRows: InventoryRow[] = (onlineProducts ?? []).map((product: any) => ({
      id: `online:${product.id}`,
      provider: "online",
      providerItemId: product.id,
      providerVariationId: product.id,
      name: product.name,
      variationName: "Default",
      sku: null,
      category: String(product.category).startsWith("coffee") ? "Cafe" : "Merch",
      stock: product.track_inventory ? product.inventory_count ?? 0 : null,
      threshold: thresholdForRow("online", product.id, String(product.category).startsWith("coffee") ? 10 : 5),
      trackInventory: Boolean(product.track_inventory),
      source: "Online",
      lastUpdated: product.updated_at ?? null,
    }));

    return NextResponse.json({ inventory: [...squareRows, ...onlineRows] });
  } catch (error) {
    console.error("Inventory fetch error", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/inventory
 * Body: { id, source, provider_variation_id, threshold }
 * Upserts a saved threshold override for one item.
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const source: "square" | "online" = body.source === "online" ? "online" : "square";
    const providerVariationId = String(body.provider_variation_id ?? body.id ?? "").trim();
    const threshold = Number(body.threshold);

    if (!providerVariationId) {
      return NextResponse.json({ error: "provider_variation_id is required" }, { status: 400 });
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      return NextResponse.json({ error: "threshold must be a non-negative number" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("inventory_thresholds")
      .upsert(
        {
          source,
          provider_variation_id: providerVariationId,
          threshold,
          item_name: String(body.item_name ?? "").slice(0, 200) || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "source,provider_variation_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ threshold: data });
  } catch (error) {
    console.error("Inventory threshold PATCH error", error);
    return NextResponse.json(
      { error: "Failed to save threshold", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

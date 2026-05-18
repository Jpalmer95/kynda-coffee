import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
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
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const catalog = await getPosCatalog({ channel: "all", includeModifiers: false, limit: 500 });
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
        threshold: thresholdFor(item.categoryName, item.itemType),
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
      threshold: String(product.category).startsWith("coffee") ? 10 : 5,
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

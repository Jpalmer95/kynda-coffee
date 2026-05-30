import type { POSAdapter, POSProduct, POSInventoryItem, POSProvider } from "./types";
import { squareCatalog, squareInventory } from "../square/client";
import { syncCatalog as syncSquareCatalogToDb } from "../square/sync";

/**
 * Square POS Adapter
 *
 * Current production adapter. Wraps the Square SDK calls into
 * the provider-agnostic POSAdapter interface.
 *
 * The existing Supabase normalized tables (pos_items, pos_item_variations,
 * etc.) are the source of truth for the frontend catalog — this adapter
 * handles provider-specific operations that go BEYOND the normalized DB:
 * - Syncing from Square → normalized tables
 * - Direct POS operations (create in-store order, update Square inventory)
 */
export class SquareAdapter implements POSAdapter {
  readonly provider: POSProvider = "square";

  /**
   * Sync the full Square catalog into the normalized pos_* tables.
   * Uses the existing syncSquareCatalog function.
   */
  async syncCatalog(): Promise<{ synced: number; errors: string[] }> {
    return syncSquareCatalogToDb();
  }

  /**
   * Fetch a single product directly from Square API.
   * For most use cases, prefer reading from the normalized DB instead.
   */
  async getProduct(providerItemId: string): Promise<POSProduct | null> {
    try {
      const { result } = await squareCatalog().retrieveCatalogObject(providerItemId, true);

      const item = result.object;
      if (!item || item.type !== "ITEM") return null;

      const itemData = item.itemData;
      const variations = (result.relatedObjects ?? [])
        .filter((obj) => obj.type === "ITEM_VARIATION")
        .map((obj) => ({
          id: obj.id!,
          name: obj.itemVariationData?.name ?? "Regular",
          sku: obj.itemVariationData?.sku ?? null,
          priceCents: Number(obj.itemVariationData?.priceMoney?.amount ?? 0),
          currency: obj.itemVariationData?.priceMoney?.currency ?? "USD",
          trackInventory: obj.itemVariationData?.trackInventory ?? false,
          stockQuantity: null,
        }));

      return {
        id: item.id!,
        name: itemData?.name ?? "",
        description: itemData?.description ?? "",
        category: "",
        priceCents: variations[0]?.priceCents ?? 0,
        currency: "USD",
        isAvailable: itemData?.isArchived !== true,
        imageUrls: [],
        variations,
        modifierLists: [],
      };
    } catch (err) {
      console.error("SquareAdapter.getProduct error:", err);
      return null;
    }
  }

  /**
   * Get inventory counts from Square.
   */
  async getInventory(): Promise<POSInventoryItem[]> {
    try {
      const { result } = await squareInventory().batchRetrieveInventoryCounts({
        catalogObjectIds: [],
        locationIds: [process.env.SQUARE_LOCATION_ID ?? ""],
      });

      return (result.counts ?? []).map((count) => ({
        providerItemId: count.catalogObjectId!,
        name: count.catalogObjectId!, // Square doesn't return names with counts
        quantity: Number(count.quantity ?? 0),
        unit: "UNIT",
      }));
    } catch (err) {
      console.error("SquareAdapter.getInventory error:", err);
      return [];
    }
  }

  /**
   * Update stock quantity in Square.
   */
  async updateStock(providerItemId: string, quantity: number): Promise<void> {
    const { squareInventory: inv } = await import("../square/client");
    await inv().batchChangeInventory({
      idempotencyKey: `kynda-stock-${providerItemId}-${Date.now()}`,
      changes: [
        {
          type: "ADJUSTMENT",
          adjustment: {
            catalogObjectId: providerItemId,
            fromState: "IN_STOCK",
            toState: "IN_STOCK",
            quantity: String(quantity),
            locationId: process.env.SQUARE_LOCATION_ID ?? "",
            occurredAt: new Date().toISOString(),
          },
        },
      ],
    });
  }
}

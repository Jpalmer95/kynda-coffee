import type { POSAdapter, POSProduct, POSInventoryItem, POSProvider } from "./types";

/**
 * Toast POS Adapter (stub)
 *
 * Implement this when migrating from Square to Toast.
 * The normalized pos_* tables in Supabase don't need to change —
 * only this adapter needs real implementation.
 *
 * Steps to implement:
 * 1. Install Toast API SDK or set up GraphQL client
 * 2. Add TOAST_API_KEY, TOAST_LOCATION_ID to env vars
 * 3. Implement syncCatalog() — fetch from Toast API → write to pos_items
 * 4. Implement getProduct() — single item lookup
 * 5. Implement getInventory() / updateStock()
 */
export class ToastAdapter implements POSAdapter {
  readonly provider: POSProvider = "toast";

  async syncCatalog(): Promise<{ synced: number; errors: string[] }> {
    throw new Error("Toast adapter not yet implemented. Use SquareAdapter.");
  }

  async getProduct(_providerItemId: string): Promise<POSProduct | null> {
    throw new Error("Toast adapter not yet implemented.");
  }

  async getInventory(): Promise<POSInventoryItem[]> {
    throw new Error("Toast adapter not yet implemented.");
  }

  async updateStock(_providerItemId: string, _quantity: number): Promise<void> {
    throw new Error("Toast adapter not yet implemented.");
  }
}

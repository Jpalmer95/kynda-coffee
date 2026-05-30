import type { POSAdapter, POSProduct, POSInventoryItem, POSProvider } from "./types";
import { getSupabaseAdmin } from "../supabase/admin";
import { mapToastMenusToProducts, type ToastMenu } from "./toast-mapping";

/**
 * Toast POS Adapter — read-catalog parity (Roadmap V2 — Epic 10).
 *
 * Proves the platform is genuinely POS-agnostic: this adapter pulls the Toast
 * Menus API v2 and writes the SAME normalized `products` rows the Square adapter
 * does, so the entire customer frontend works unchanged when POS_PROVIDER=toast.
 *
 * To switch a real store to Toast:
 *   1. Set POS_PROVIDER=toast, TOAST_API_HOSTNAME, TOAST_ACCESS_TOKEN,
 *      TOAST_RESTAURANT_GUID in Coolify env.
 *   2. Run the catalog sync (admin Square Sync page / cron calls getPOSAdapter().syncCatalog()).
 *   3. The normalized tables + frontend need no changes.
 *
 * Inventory write-back is provider-specific and intentionally out of scope for
 * read-catalog parity; it throws a clear "not supported" error until implemented.
 */
export class ToastAdapter implements POSAdapter {
  readonly provider: POSProvider = "toast";

  private config() {
    const hostname = process.env.TOAST_API_HOSTNAME || "https://ws-api.toasttab.com";
    const token = process.env.TOAST_ACCESS_TOKEN;
    const restaurantGuid = process.env.TOAST_RESTAURANT_GUID;
    return { hostname, token, restaurantGuid };
  }

  /** Fetch the published menus from Toast's Menus API v2. */
  private async fetchMenus(): Promise<ToastMenu[]> {
    const { hostname, token, restaurantGuid } = this.config();
    if (!token || !restaurantGuid) {
      throw new Error(
        "Toast not configured: set TOAST_ACCESS_TOKEN and TOAST_RESTAURANT_GUID (and optionally TOAST_API_HOSTNAME)."
      );
    }
    const res = await fetch(`${hostname}/menus/v2/menus`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Toast-Restaurant-External-ID": restaurantGuid,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Toast Menus API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    // The endpoint returns either { menus: [...] } or a bare array depending on version.
    return Array.isArray(data) ? (data as ToastMenu[]) : ((data?.menus ?? []) as ToastMenu[]);
  }

  /**
   * Sync the Toast catalog into the normalized `products` table — identical shape
   * to the Square sync, proving portability.
   */
  async syncCatalog(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    let products;
    try {
      const menus = await this.fetchMenus();
      products = mapToastMenusToProducts(menus);
    } catch (err) {
      return { synced: 0, errors: [`Toast catalog fetch failed: ${err instanceof Error ? err.message : String(err)}`] };
    }

    const supabase = getSupabaseAdmin();
    for (const product of products) {
      const { error } = await supabase.from("products").upsert(product as never, { onConflict: "slug" });
      if (error) errors.push(`${product.name}: ${error.message}`);
      else synced++;
    }
    return { synced, errors };
  }

  /** Read a single product from the normalized DB (provider-agnostic). */
  async getProduct(providerItemId: string): Promise<POSProduct | null> {
    const { data } = await getSupabaseAdmin()
      .from("products")
      .select("slug, name, description, category, price_cents, is_active, images")
      .eq("slug", providerItemId)
      .maybeSingle();
    if (!data) return null;
    const row = data as {
      slug: string;
      name: string;
      description: string | null;
      category: string | null;
      price_cents: number | null;
      is_active: boolean | null;
      images: string[] | null;
    };
    return {
      id: row.slug,
      name: row.name,
      description: row.description ?? "",
      category: row.category ?? "",
      priceCents: row.price_cents ?? 0,
      currency: "USD",
      isAvailable: row.is_active !== false,
      imageUrls: row.images ?? [],
      variations: [],
      modifierLists: [],
    };
  }

  async getInventory(): Promise<POSInventoryItem[]> {
    // Read-catalog parity ships first; Toast inventory read is a follow-up.
    return [];
  }

  async updateStock(_providerItemId: string, _quantity: number): Promise<void> {
    throw new Error("Toast inventory write-back not yet supported (read-catalog parity only).");
  }
}

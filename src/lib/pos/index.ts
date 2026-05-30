import type { POSAdapter, POSProvider } from "./types";
import { SquareAdapter } from "./square-adapter";
import { ToastAdapter } from "./toast-adapter";

// Re-export types
export type { POSAdapter, POSProvider } from "./types";
export type {
  POSProduct,
  POSVariation,
  POSModifierList,
  POSModifier,
  POSOrder,
  POSOrderItem,
  POSCustomer,
  POSInventoryItem,
} from "./types";

// Re-export catalog functions (already provider-agnostic, reads from DB)
export {
  getPosCatalog,
  mapPosCatalogRows,
  applyCatalogOverrides,
  groupCatalogByCategory,
  shouldIncludeItemForChannel,
  formatMoney,
  mapPosCatalogItemToProduct,
  categoryForPosItem,
} from "./catalog";

export type {
  PosCatalogChannel,
  PosCatalogItem,
  PosCatalogCategoryGroup,
  PosCatalogResult,
  PosCatalogRow,
  PosCatalogVariation,
  PosCatalogModifierList,
  PosCatalogModifier,
  GetPosCatalogOptions,
  MapPosCatalogOptions,
  CatalogOverrideRow,
} from "./catalog";

const adapters: Record<POSProvider, () => POSAdapter> = {
  square: () => new SquareAdapter(),
  toast: () => new ToastAdapter(),
  clover: () => {
    throw new Error("Clover adapter not yet implemented.");
  },
};

let _cachedAdapter: POSAdapter | null = null;

/**
 * Get the configured POS adapter.
 *
 * Reads POS_PROVIDER from environment (defaults to "square").
 * The adapter is cached as a singleton.
 *
 * To switch POS providers:
 * 1. Set POS_PROVIDER=toast in Coolify env vars
 * 2. Implement the Toast adapter (src/lib/pos/toast-adapter.ts)
 * 3. Redeploy — the normalized pos_* tables are provider-agnostic
 */
export function getPOSAdapter(): POSAdapter {
  if (!_cachedAdapter) {
    const provider = (process.env.POS_PROVIDER ?? "square") as POSProvider;
    const factory = adapters[provider];
    if (!factory) {
      throw new Error(`Unknown POS provider: ${provider}. Available: ${Object.keys(adapters).join(", ")}`);
    }
    _cachedAdapter = factory();
  }
  return _cachedAdapter;
}

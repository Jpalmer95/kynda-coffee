// POS Abstraction Layer — provider-agnostic types
// Any POS system (Square, Toast, etc.) implements these interfaces

export interface POSProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  imageUrls: string[];
  variations: POSVariation[];
  modifierLists: POSModifierList[];
}

export interface POSVariation {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  currency: string;
  trackInventory: boolean;
  stockQuantity?: number | null;
}

export interface POSModifierList {
  id: string;
  name: string;
  selectionType: "single" | "multiple";
  minSelected: number | null;
  maxSelected: number | null;
  modifiers: POSModifier[];
}

export interface POSModifier {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  onByDefault: boolean;
}

export interface POSOrder {
  id: string;
  providerOrderId: string;
  status: "pending" | "confirmed" | "processing" | "completed" | "cancelled";
  items: POSOrderItem[];
  totalCents: number;
  currency: string;
  customerEmail?: string;
  notes?: string;
  createdAt: string;
}

export interface POSOrderItem {
  name: string;
  quantity: number;
  priceCents: number;
  variationName?: string;
  modifiers?: string[];
}

export interface POSCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: string;
}

export interface POSInventoryItem {
  providerItemId: string;
  name: string;
  quantity: number;
  unit: string;
}

export type POSProvider = "square" | "toast" | "clover";

/**
 * POS Adapter interface — each POS system implements this.
 * The platform calls these methods through getPOSAdapter().
 */
export interface POSAdapter {
  readonly provider: POSProvider;

  // Catalog
  syncCatalog(): Promise<{ synced: number; errors: string[] }>;
  getProduct(providerItemId: string): Promise<POSProduct | null>;

  // Inventory
  getInventory(): Promise<POSInventoryItem[]>;
  updateStock(providerItemId: string, quantity: number): Promise<void>;

  // Orders (in-person POS, if applicable)
  createOrder?(items: POSOrderItem[], notes?: string): Promise<POSOrder>;

  // Customers
  findOrCreateCustomer?(email: string, name?: string): Promise<POSCustomer>;
}

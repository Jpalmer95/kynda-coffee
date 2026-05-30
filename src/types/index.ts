// ============================================================
// Kynda Coffee — Core Type Definitions
// ============================================================
// These types define the data contracts across the entire app.
// Supabase tables, API routes, and components all reference these.

// ---- Products & Catalog ----

export type ProductCategory =
  | "coffee-beans"
  | "merch-apparel"
  | "merch-mugs"
  | "merch-glassware"
  | "merch-accessories"
  | "brew-gear"
  | "bulk-tea"
  | "apothecary"
  | "design-studio"
  | "subscription"
  | "gift-card"
  | "catering";

export type RoastLevel = "light" | "medium" | "medium-dark" | "dark";

export type GrindType =
  | "whole-bean"
  | "espresso"
  | "drip"
  | "pour-over"
  | "french-press"
  | "cold-brew";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  price_cents: number;
  compare_at_price_cents?: number;
  images: string[];
  stripe_product_id?: string;
  stripe_price_id?: string;
  // Source tracking
  source: "square" | "online" | "both" | "design_studio";
  square_item_id?: string;
  square_variation_id?: string;
  track_inventory: boolean;
  inventory_synced_at?: string;
  // Coffee-specific
  roast_level?: RoastLevel;
  grind_options?: GrindType[];
  origin?: string;
  tasting_notes?: string[];
  // Merch-specific
  sizes?: string[];
  colors?: ProductColor[];
  // POD fulfillment
  printful_variant_id?: string;
  // Design Studio / custom products
  design_data?: {
    printful_variant_id?: string | number;
    [key: string]: any;
  };
  // Meta
  is_active: boolean;
  is_featured: boolean;
  inventory_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductColor {
  name: string;
  hex: string;
  image_url?: string;
}

// ---- Cart ----

export interface CartItemVariant {
  size?: string;
  grind?: string;
  color?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: CartItemVariant;
}

export interface Cart {
  items: CartItem[];
  subtotal_cents: number;
  item_count: number;
  discount_cents: number;
  promo_code?: string;
}

// ---- Orders ----

export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "ready"
  | "complete"
  | "cancelled"
  | "delivered"
  | "fulfilled"
  | "refunded"
  | "shipped";

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  variant_name?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  email: string;
  status: OrderStatus;
  source: "square" | "online" | "qr" | "design_studio";
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: Record<string, unknown> | null;
  notes: string;
  created_at: string;
  updated_at: string;
  payment_status?: string;
  payment_method?: string;
  stripe_session_id?: string;
  stripe_checkout_session_id?: string;
  printful_order_id?: string | number;
  payment_metadata?: Record<string, unknown>;
}

// ---- Promo Codes ----

export type PromoType =
  | "percentage"
  | "fixed"
  | "free_shipping"
  | "bogo";

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  description?: string;
  min_order_cents?: number;
  max_uses?: number;
  current_uses: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  applies_to: "all" | "category" | "product";
  applies_to_ids?: string[];
  uses_count?: number;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}
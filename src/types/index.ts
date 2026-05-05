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
  source: "square" | "online" | "both";
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

// ---- Orders ----

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderSource = "website" | "pos" | "qr" | "delivery" | "subscription";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded" | "void";
export type PaymentMethod = "unknown" | "pay_at_counter" | "cash" | "card" | "stripe" | "square" | "comp" | "gift_card";

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  email: string;
  status: OrderStatus;
  source: OrderSource;
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  square_order_id?: string;
  printful_order_id?: string;
  shipping_address?: Address;
  notes?: string;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_preference?: string;
  payment_metadata?: Record<string, unknown>;
  fulfillment_metadata?: Record<string, unknown>;
  order_channel?: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  variant_name?: string; // e.g., "Large / Black"
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  // For custom/ai designs
  design_id?: string;
  design_preview_url?: string;
}

// ---- Customers ----

export interface Customer {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  stripe_customer_id?: string;
  square_customer_id?: string;
  // Marketing
  email_opt_in: boolean;
  sms_opt_in: boolean;
  // Loyalty
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  // Meta
  total_orders: number;
  total_spent_cents: number;
  first_order_at?: string;
  last_order_at?: string;
  created_at: string;
}

export type LoyaltyTier = "bronze" | "silver" | "gold" | "kynda-vip";

// ---- Subscriptions ----

export type SubscriptionStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "past_due"
  | "trialing";

export interface Subscription {
  id: string;
  customer_id: string;
  product_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  // Coffee club specifics
  grind?: GrindType;
  frequency: "weekly" | "biweekly" | "monthly";
  next_delivery_at?: string;
  created_at: string;
  cancelled_at?: string;
}

// ---- Addresses ----

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// ---- AI Design Studio ----

export type DesignStatus =
  | "draft"
  | "generating"
  | "review"
  | "approved"
  | "published"
  | "archived";

export interface Design {
  id: string;
  customer_id?: string; // null = admin/curated design
  name: string;
  description?: string;
  category: DesignCategory;
  status: DesignStatus;
  // Generation params
  prompt: string;
  style_preset?: string;
  // Output
  original_image_url: string;
  mockup_urls: string[];
  // Product mapping
  applicable_products: ProductCategory[];
  // Printful
  printful_design_id?: string;
  // Meta
  is_public: boolean;
  likes: number;
  created_at: string;
}

export type DesignCategory =
  | "kynda-core"
  | "trending"
  | "coffee-vibes"
  | "nature-texas"
  | "customer-created"
  | "seasonal";

// ---- Marketing ----

export interface Campaign {
  id: string;
  name: string;
  type: "email" | "sms" | "social";
  status: "draft" | "scheduled" | "sent" | "cancelled";
  subject?: string;
  content: string;
  audience_filter?: string; // JSON filter for customer segments
  scheduled_at?: string;
  sent_at?: string;
  stats?: CampaignStats;
  created_at: string;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
}

export interface SocialPost {
  id: string;
  platform: "instagram" | "facebook" | "tiktok";
  content: string;
  media_urls: string[];
  status: "draft" | "scheduled" | "published";
  scheduled_at?: string;
  published_at?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  created_at: string;
}

// ---- In-Store (Square sync) ----

export interface SquareSync {
  last_inventory_sync: string;
  last_catalog_sync: string;
  last_orders_sync: string;
  sync_status: "idle" | "syncing" | "error";
  error_message?: string;
}

// ---- Cart (client-side) ----

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: {
    size?: string;
    color?: string;
    grind?: GrindType;
  };
  customDesign?: {
    design_id: string;
    preview_url: string;
  };
}

export interface Cart {
  items: CartItem[];
  subtotal_cents: number;
  item_count: number;
  discount_cents?: number;
  promo_code?: string;
}

// ---- Promo / Gift Cards ----

export type PromoType = "percentage" | "fixed_amount" | "free_shipping";

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number; // percentage (0-100) or fixed amount in cents
  min_order_cents?: number;
  max_uses?: number;
  uses_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}


// ---- Training Platform ----

export type UserRole = "employee" | "admin";

export interface TrainingProfile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TrainingModule {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string;
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  content: string;
  video_url: string | null;
  video_title: string | null;
  sort_order: number;
  lesson_type: "text" | "video" | "mixed";
  created_at: string;
}

export interface TrainingQuiz {
  id: string;
  module_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  sort_order: number;
}

export interface TrainingModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  lessons_completed: number;
  total_lessons: number;
  quizzes_passed: number;
  total_quizzes: number;
  is_complete: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface TrainingCourseCompletion {
  id: string;
  user_id: string;
  course_id: string;
  completed_at: string;
}

export interface TrainingEmployeeProgress {
  id: string;
  full_name: string;
  email: string;
  modules_completed: number;
  total_modules: number;
  is_course_complete: boolean;
  completion_date: string | null;
  last_activity: string | null;
  created_at: string;
}

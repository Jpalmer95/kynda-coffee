// Supabase generated types placeholder
// Run `supabase gen types typescript` to generate real types from your DB
// Or use the Supabase CLI: npx supabase gen types typescript --local > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          category: string;
          price_cents: number;
          compare_at_price_cents: number | null;
          images: string[];
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          roast_level: string | null;
          grind_options: string[];
          origin: string | null;
          tasting_notes: string[];
          sizes: string[];
          colors: Json;
          printful_variant_id: string | null;
          is_active: boolean;
          is_featured: boolean;
          inventory_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          stripe_customer_id: string | null;
          square_customer_id: string | null;
          email_opt_in: boolean;
          sms_opt_in: boolean;
          loyalty_points: number;
          loyalty_tier: string;
          total_orders: number;
          total_spent_cents: number;
          first_order_at: string | null;
          last_order_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          email: string;
          status: string;
          source: string;
          items: Json;
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          total_cents: number;
          stripe_payment_intent_id: string | null;
          stripe_checkout_session_id: string | null;
          square_order_id: string | null;
          printful_order_id: string | null;
          shipping_address: Json | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          stripe_subscription_id: string;
          status: string;
          grind: string | null;
          frequency: string;
          next_delivery_at: string | null;
          created_at: string;
          cancelled_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["subscriptions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      designs: {
        Row: {
          id: string;
          customer_id: string | null;
          name: string;
          description: string | null;
          category: string;
          status: string;
          prompt: string;
          style_preset: string | null;
          original_image_url: string;
          mockup_urls: string[];
          applicable_products: string[];
          printful_design_id: string | null;
          is_public: boolean;
          likes: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["designs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["designs"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          type: string;
          status: string;
          subject: string | null;
          content: string;
          audience_filter: Json | null;
          scheduled_at: string | null;
          sent_at: string | null;
          stats: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      social_posts: {
        Row: {
          id: string;
          platform: string;
          content: string;
          media_urls: string[];
          status: string;
          scheduled_at: string | null;
          published_at: string | null;
          engagement: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["social_posts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["social_posts"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

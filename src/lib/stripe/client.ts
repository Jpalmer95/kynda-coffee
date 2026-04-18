import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Kynda Coffee store settings
export const STORE_CONFIG = {
  name: "Kynda Coffee",
  currency: "usd",
  tax_rate: 0.0825, // Texas sales tax (Horseshoe Bay)
  free_shipping_threshold_cents: 5000, // Free shipping over $50
  flat_shipping_cents: 599, // $5.99 flat rate under threshold
  loyalty_points_per_dollar: 10,
} as const;

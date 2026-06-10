/**
 * Server-side pricing-profile resolver (Epic 2). Server-only — imports the
 * service-role Supabase client; never import from client components.
 *
 * Merges owner-persisted overrides (public.pricing_rules, /admin/pricing) over
 * the engine's DEFAULT_PRICING_PROFILES. The pure engine stays dependency-free;
 * this is the only place DB state enters pricing. 60s in-process cache keeps
 * hot paths (estimate quotes) cheap.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_PRICING_PROFILES,
  getPricingProfile,
  type PricingProfile,
  type RoundingStrategy,
} from "@/lib/pricing/engine";

export interface PricingRuleRow {
  category: string;
  target_margin_pct: number;
  min_profit_cents: number;
  rounding: RoundingStrategy;
  shipping_buffer_cents: number;
  notes: string | null;
  updated_at: string;
}

let cache: { rows: PricingRuleRow[]; at: number } | null = null;
const CACHE_MS = 60_000;

export async function fetchPricingRules(force = false): Promise<PricingRuleRow[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  try {
    const { data, error } = await supabaseAdmin()
      .from("pricing_rules")
      .select("category, target_margin_pct, min_profit_cents, rounding, shipping_buffer_cents, notes, updated_at");
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({
      ...r,
      target_margin_pct: Number(r.target_margin_pct),
    })) as PricingRuleRow[];
    cache = { rows, at: Date.now() };
    return rows;
  } catch {
    // Table missing / DB hiccup → defaults still guarantee profit.
    return cache?.rows ?? [];
  }
}

/** Effective profile for a category: DB override if present, else engine default. */
export async function getEffectivePricingProfile(category: string): Promise<PricingProfile> {
  const rules = await fetchPricingRules();
  const row = rules.find((r) => r.category === category);
  if (!row) return getPricingProfile(category);
  return {
    targetMarginPct: row.target_margin_pct,
    minProfitCents: row.min_profit_cents,
    rounding: row.rounding,
    shippingBufferCents: row.shipping_buffer_cents,
  };
}

/** All categories the admin UI should list: defaults ∪ overridden. */
export async function listEffectiveProfiles(): Promise<
  { category: string; profile: PricingProfile; overridden: boolean; notes: string | null; updated_at: string | null }[]
> {
  const rules = await fetchPricingRules(true);
  const byCat = new Map(rules.map((r) => [r.category, r]));
  const categories = Array.from(
    new Set([...Object.keys(DEFAULT_PRICING_PROFILES), ...rules.map((r) => r.category)])
  ).sort();
  return categories.map((category) => {
    const row = byCat.get(category);
    return row
      ? {
          category,
          profile: {
            targetMarginPct: row.target_margin_pct,
            minProfitCents: row.min_profit_cents,
            rounding: row.rounding,
            shippingBufferCents: row.shipping_buffer_cents,
          },
          overridden: true,
          notes: row.notes,
          updated_at: row.updated_at,
        }
      : { category, profile: getPricingProfile(category), overridden: false, notes: null, updated_at: null };
  });
}

export function invalidatePricingRulesCache() {
  cache = null;
}

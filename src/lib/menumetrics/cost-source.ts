import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cost-source bridge (Epic 7 ↔ Epic 2). Reads the cached MenuMetrics recipe
 * cost for a catalog item so the Pricing Engine can use the true,
 * gram-level fully-loaded cost as its cost basis for advisory margin checks.
 * Admin-backend only. Returns null when not linked / not synced, so callers
 * fall back to their existing cost basis.
 */
export async function recipeCostCentsFor(menuMetricsRecipeId: string | null | undefined): Promise<number | null> {
  if (!menuMetricsRecipeId) return null;
  try {
    const { data } = await supabaseAdmin()
      .from("menumetrics_recipe_costs")
      .select("cost_per_serving_cents")
      .eq("recipe_id", menuMetricsRecipeId)
      .maybeSingle();
    const cents = data?.cost_per_serving_cents;
    return typeof cents === "number" && cents > 0 ? cents : null;
  } catch {
    return null;
  }
}

/** Look up cached ingredient cost (for waste-log auto-fill, Epic 4). */
export async function ingredientCostCentsFor(ingredientId: string | null | undefined): Promise<number | null> {
  if (!ingredientId) return null;
  try {
    const { data } = await supabaseAdmin()
      .from("vendor_prices")
      .select("cost_cents")
      .eq("ingredient_id", ingredientId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const cents = data?.cost_cents;
    return typeof cents === "number" && cents > 0 ? cents : null;
  } catch {
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireTier } from "@/lib/auth/team";
import {
  isMenuMetricsConfigured,
  fetchRecipes,
  fetchIngredients,
  fetchStock,
} from "@/lib/menumetrics/client";
import { detectLowStock, type StockLevel } from "@/lib/menumetrics/inventory";

/**
 * POST /api/admin/menumetrics/sync  (Epic 7, admin-backend only)
 *
 * Sync that pulls from MenuMetrics into Kynda's cache:
 *   - all recipe costs -> menumetrics_recipe_costs
 *   - ingredient/vendor prices -> append to vendor_prices (trend history)
 *   - inventory levels -> menumetrics_stock + low-stock alerts
 *
 * Auth: EITHER Bearer CRON_SECRET (Hermes nightly cron) OR a logged-in
 * manager+ session (the admin panel "Sync now" button).
 * Read-only against MenuMetrics. No-ops gracefully when not configured.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const cronOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  if (!cronOk) {
    const team = await requireTier(req, "manager");
    if (!team) {
      if (!cronSecret) {
        console.warn("[menumetrics/sync] CRON_SECRET not set and no admin session.");
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isMenuMetricsConfigured()) {
    return NextResponse.json(
      { success: false, skipped: true, reason: "MENU_METRICS_URL not configured" },
      { status: 200 }
    );
  }

  const supabase = supabaseAdmin();
  const summary = { recipes: 0, ingredients: 0, stock: 0, alerts: 0, errors: [] as string[] };

  // 1) Recipe costs — sync ALL recipes from the bridge (one call), so the
  // admin recipe-link picker and margin columns always have fresh costs.
  try {
    const recipes = await fetchRecipes();
    for (const cost of recipes) {
      const { error } = await supabase.from("menumetrics_recipe_costs").upsert(
        {
          recipe_id: cost.id,
          name: cost.name,
          yield_servings: cost.yield_servings,
          cost_per_serving_cents: cost.cost_per_serving_cents,
          ingredient_cost_cents: cost.ingredient_cost_cents,
          source_updated_at: cost.updated_at,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "recipe_id" }
      );
      if (!error) summary.recipes++;
    }
  } catch (err) {
    summary.errors.push(`recipes: ${String(err)}`);
  }

  // 2) Ingredient/vendor prices — snapshot to vendor_prices (append-only history).
  try {
    const ingredients = await fetchIngredients();
    if (ingredients.length > 0) {
      const rows = ingredients.map((i) => ({
        ingredient_id: i.id,
        ingredient_name: i.name,
        vendor: i.vendor,
        pack_size: i.pack_size,
        unit: i.unit,
        cost_cents: i.cost_cents,
        captured_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("vendor_prices").insert(rows);
      if (!error) summary.ingredients = rows.length;
    }
  } catch (err) {
    summary.errors.push(`ingredients: ${String(err)}`);
  }

  // 3) Inventory levels -> cache + low-stock alerts.
  try {
    const stock = await fetchStock();
    if (stock.length > 0) {
      const levels: StockLevel[] = stock.map((s) => ({
        ingredient_id: s.ingredient_id,
        name: s.name,
        on_hand: s.on_hand,
        reorder_threshold: s.reorder_threshold,
      }));
      const lowAlerts = detectLowStock(levels);
      const lowIds = new Set(lowAlerts.map((a) => a.ingredient_id));

      const stockRows = stock.map((s) => ({
        ingredient_id: s.ingredient_id,
        name: s.name,
        on_hand: s.on_hand,
        unit: s.unit,
        reorder_threshold: s.reorder_threshold,
        is_low: lowIds.has(s.ingredient_id),
        source_updated_at: s.updated_at,
        synced_at: new Date().toISOString(),
      }));
      await supabase.from("menumetrics_stock").upsert(stockRows, { onConflict: "ingredient_id" });
      summary.stock = stockRows.length;

      // Record new alerts (avoid duplicating an unacknowledged open alert).
      for (const alert of lowAlerts) {
        const { data: existing } = await supabase
          .from("inventory_alerts")
          .select("id")
          .eq("ingredient_id", alert.ingredient_id)
          .eq("acknowledged", false)
          .maybeSingle();
        if (!existing) {
          await supabase.from("inventory_alerts").insert({
            ingredient_id: alert.ingredient_id,
            ingredient_name: alert.name,
            alert_type: alert.status === "out" ? "out_of_stock" : "low_stock",
            message: alert.message,
            on_hand: alert.on_hand,
            threshold: alert.threshold,
          });
          summary.alerts++;
        }
      }
    }
  } catch (err) {
    summary.errors.push(`stock: ${String(err)}`);
  }

  return NextResponse.json({ success: summary.errors.length === 0, ...summary });
}

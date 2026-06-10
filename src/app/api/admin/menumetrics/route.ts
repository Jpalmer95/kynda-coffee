import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isMenuMetricsConfigured, checkHealth } from "@/lib/menumetrics/client";
import { computePriceTrends, type VendorPriceSnapshot } from "@/lib/menumetrics/price-watch";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/menumetrics — the MenuMetrics panel data for /admin/inventory.
 *
 * Manager+ only (MenuMetrics is admin-backend; owner rule). Serves cached data
 * (Supabase) so the panel renders even when MenuMetrics is down:
 *   - recipe costs (menumetrics_recipe_costs)
 *   - ingredient stock + low flags (menumetrics_stock)
 *   - open inventory alerts
 *   - vendor price trends (computed from vendor_prices history)
 *   - connection status (live health probe, best-effort)
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const windowDays = Math.min(
    Math.max(parseInt(new URL(req.url).searchParams.get("window") ?? "90", 10) || 90, 7),
    365
  );

  try {
    const since = new Date(Date.now() - windowDays * 864e5).toISOString();
    const [recipesRes, stockRes, alertsRes, pricesRes, health] = await Promise.all([
      db
        .from("menumetrics_recipe_costs")
        .select("recipe_id, name, yield_servings, cost_per_serving_cents, ingredient_cost_cents, synced_at")
        .order("name"),
      db
        .from("menumetrics_stock")
        .select("ingredient_id, name, on_hand, unit, reorder_threshold, is_low, synced_at")
        .order("is_low", { ascending: false }),
      db
        .from("inventory_alerts")
        .select("id, ingredient_name, alert_type, message, on_hand, threshold, created_at")
        .eq("acknowledged", false)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("vendor_prices")
        .select("ingredient_id, ingredient_name, vendor, pack_size, unit, cost_cents, captured_at")
        .gte("captured_at", since)
        .order("captured_at", { ascending: true })
        .limit(5000),
      isMenuMetricsConfigured() ? checkHealth() : Promise.resolve(null),
    ]);

    const priceWatch = computePriceTrends(
      (pricesRes.data ?? []) as VendorPriceSnapshot[],
      windowDays
    );

    return NextResponse.json({
      connected: Boolean(health?.ok),
      configured: isMenuMetricsConfigured(),
      recipes: recipesRes.data ?? [],
      stock: stockRes.data ?? [],
      alerts: alertsRes.data ?? [],
      price_watch: priceWatch,
    });
  } catch (error) {
    console.error("[admin/menumetrics] error", error);
    return NextResponse.json({ error: "Failed to load MenuMetrics data" }, { status: 500 });
  }
}

/**
 * PATCH — acknowledge an inventory alert. Body: { alert_id }.
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const alertId = typeof body.alert_id === "string" ? body.alert_id : "";
    if (!alertId) return NextResponse.json({ error: "alert_id required" }, { status: 400 });

    const { error } = await supabaseAdmin()
      .from("inventory_alerts")
      .update({ acknowledged: true })
      .eq("id", alertId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/menumetrics] ack error", error);
    return NextResponse.json({ error: "Failed to acknowledge alert" }, { status: 500 });
  }
}

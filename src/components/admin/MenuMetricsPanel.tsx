"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChefHat,
  CheckCircle2,
  Loader2,
  PlugZap,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/**
 * MenuMetrics panel — recipe costing, ingredient stock, and vendor price-watch
 * inside /admin/inventory. Data comes from Kynda's Supabase cache (synced from
 * the MenuMetrics agent bridge), so the panel works even when MenuMetrics is
 * briefly offline. Manager+ only (the API enforces it).
 */

type RecipeCost = {
  recipe_id: string;
  name: string | null;
  yield_servings: number | null;
  cost_per_serving_cents: number;
  ingredient_cost_cents: number;
  synced_at: string | null;
};

type StockRow = {
  ingredient_id: string;
  name: string | null;
  on_hand: number;
  unit: string | null;
  reorder_threshold: number | null;
  is_low: boolean;
  synced_at: string | null;
};

type AlertRow = {
  id: string;
  ingredient_name: string | null;
  alert_type: string;
  message: string | null;
  on_hand: number | null;
  threshold: number | null;
  created_at: string;
};

type PriceTrend = {
  ingredient_id: string;
  ingredient_name: string;
  vendor: string;
  pack_size: string | null;
  current_cost_cents: number;
  baseline_cost_cents: number;
  change_pct: number;
  classification: "stable" | "creep" | "spike" | "decrease";
};

type PanelData = {
  connected: boolean;
  configured: boolean;
  recipes: RecipeCost[];
  stock: StockRow[];
  alerts: AlertRow[];
  price_watch: {
    window_days: number;
    ingredients_analyzed: number;
    flagged: PriceTrend[];
    decreases: PriceTrend[];
    stable_count: number;
  };
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function MenuMetricsPanel() {
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/menumetrics", { cache: "no-store" });
      if (res.status === 401) {
        // Staff tier — panel is manager+ only; hide quietly.
        setData(null);
        return;
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load MenuMetrics data");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MenuMetrics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function ackAlert(alertId: string) {
    try {
      await fetch("/api/admin/menumetrics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId }),
      });
      await load();
    } catch {
      // best-effort
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/menumetrics/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sync failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-2xl border border-latte/20 bg-card py-10 text-mocha">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading recipe costing...
      </div>
    );
  }

  if (!data) return null;

  const lowStock = data.stock.filter((s) => s.is_low);

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-6 w-6 text-forest" />
          <div>
            <h2 className="font-heading text-xl font-bold text-espresso">Recipe Costing &amp; Vendor Watch</h2>
            <p className="text-xs text-mocha">
              Powered by MenuMetrics •{" "}
              {data.configured ? (
                data.connected ? (
                  <span className="inline-flex items-center gap-1 text-sage">
                    <PlugZap className="h-3 w-3" /> connected
                  </span>
                ) : (
                  <span className="text-bronze">offline — showing cached data</span>
                )
              ) : (
                <span className="text-bronze">not configured (set MENU_METRICS_URL + TOKEN)</span>
              )}
            </p>
          </div>
        </div>
        <button className="btn-secondary text-sm" onClick={syncNow} disabled={syncing || !data.configured}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync from MenuMetrics
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-bronze/30 bg-bronze/10 p-4 text-sm text-espresso">{error}</div>
      )}

      {/* Open alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-bronze/30 bg-bronze/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-espresso">
            <AlertTriangle className="h-4 w-4 text-bronze" /> Open Inventory Alerts ({data.alerts.length})
          </h3>
          <ul className="space-y-2">
            {data.alerts.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-3 text-sm text-espresso">
                <span>
                  <span className="font-medium">{alert.ingredient_name ?? "Ingredient"}</span>{" "}
                  <span className="text-mocha">— {alert.message ?? alert.alert_type}</span>
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-latte/40 px-3 py-1 text-xs text-mocha hover:bg-latte/10"
                  onClick={() => ackAlert(alert.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipe costs */}
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-espresso">Recipe Costs ({data.recipes.length})</h3>
          {data.recipes.length === 0 ? (
            <p className="py-4 text-sm text-mocha">
              No recipes synced yet. Build recipes in MenuMetrics (or let an agent propose them) and run a sync.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-latte/20 text-left text-xs text-mocha">
                  <th className="py-2 pr-2 font-medium">Recipe</th>
                  <th className="py-2 pr-2 text-right font-medium">Cost/Serving</th>
                  <th className="py-2 text-right font-medium">Ingredients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {data.recipes.map((r) => (
                  <tr key={r.recipe_id}>
                    <td className="py-2 pr-2 text-espresso">{r.name ?? r.recipe_id}</td>
                    <td className="py-2 pr-2 text-right font-semibold text-espresso">
                      {money(r.cost_per_serving_cents)}
                    </td>
                    <td className="py-2 text-right text-mocha">{money(r.ingredient_cost_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ingredient stock */}
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-espresso">
            Ingredient Stock ({data.stock.length}) {lowStock.length > 0 && (
              <span className="ml-1 rounded-full bg-bronze/15 px-2 py-0.5 text-xs text-espresso">
                {lowStock.length} low
              </span>
            )}
          </h3>
          {data.stock.length === 0 ? (
            <p className="py-4 text-sm text-mocha">
              No ingredient stock synced. Set on-hand counts + par values in MenuMetrics to track them here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-latte/20 text-left text-xs text-mocha">
                  <th className="py-2 pr-2 font-medium">Ingredient</th>
                  <th className="py-2 pr-2 text-right font-medium">On Hand</th>
                  <th className="py-2 text-right font-medium">Par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {data.stock.map((s) => (
                  <tr key={s.ingredient_id} className={s.is_low ? "bg-bronze/5" : ""}>
                    <td className="py-2 pr-2 text-espresso">
                      {s.name ?? s.ingredient_id}
                      {s.is_low && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-bronze" />}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold text-espresso">
                      {s.on_hand} {s.unit ?? ""}
                    </td>
                    <td className="py-2 text-right text-mocha">{s.reorder_threshold ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vendor price watch */}
      <div className="mt-6 rounded-2xl border border-latte/20 bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-espresso">
          Vendor Price Watch ({data.price_watch.window_days}d window)
        </h3>
        <p className="mb-3 text-xs text-mocha">
          {data.price_watch.ingredients_analyzed} ingredient/vendor pairs tracked • {data.price_watch.stable_count}{" "}
          stable • report-only (vendor switches need owner approval)
        </p>
        {data.price_watch.flagged.length === 0 && data.price_watch.decreases.length === 0 ? (
          <p className="text-sm text-sage">No price movement flagged. Vendors are behaving.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.price_watch.flagged.map((t) => (
              <li key={`${t.ingredient_id}-${t.vendor}`} className="flex items-center gap-2 text-espresso">
                <TrendingUp className={`h-4 w-4 ${t.classification === "spike" ? "text-bronze" : "text-mocha"}`} />
                <span className="font-medium">{t.ingredient_name}</span>
                <span className="text-mocha">({t.vendor})</span>
                <span>
                  {money(t.baseline_cost_cents)} → {money(t.current_cost_cents)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.classification === "spike" ? "bg-bronze/15 text-espresso" : "bg-latte/20 text-mocha"}`}>
                  +{t.change_pct}% {t.classification}
                </span>
              </li>
            ))}
            {data.price_watch.decreases.map((t) => (
              <li key={`${t.ingredient_id}-${t.vendor}`} className="flex items-center gap-2 text-espresso">
                <TrendingDown className="h-4 w-4 text-sage" />
                <span className="font-medium">{t.ingredient_name}</span>
                <span className="text-mocha">({t.vendor})</span>
                <span>
                  {money(t.baseline_cost_cents)} → {money(t.current_cost_cents)}
                </span>
                <span className="rounded-full bg-sage/20 px-2 py-0.5 text-xs font-medium text-sage">
                  {t.change_pct}% cheaper
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

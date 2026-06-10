/**
 * Vendor price-watch (Epic 7) — pure analysis over the append-only
 * vendor_prices snapshot history. Detects per-ingredient cost inflation
 * (slow creep or spikes) so a vendor like HEB/Amazon can't quietly raise
 * prices without the owner noticing.
 *
 * Report-only by design: switching vendors always requires owner approval.
 */

export interface VendorPriceSnapshot {
  ingredient_id: string;
  ingredient_name: string | null;
  vendor: string | null;
  pack_size: string | null;
  unit: string | null;
  cost_cents: number;
  captured_at: string;
}

export interface PriceTrend {
  ingredient_id: string;
  ingredient_name: string;
  vendor: string;
  pack_size: string | null;
  current_cost_cents: number;
  baseline_cost_cents: number;
  change_cents: number;
  change_pct: number;
  baseline_date: string;
  current_date: string;
  classification: "stable" | "creep" | "spike" | "decrease";
}

export interface PriceWatchReport {
  generated_at: string;
  window_days: number;
  ingredients_analyzed: number;
  flagged: PriceTrend[];
  decreases: PriceTrend[];
  stable_count: number;
}

/** Spike: >=15% in the window. Creep: >=5%. */
const SPIKE_PCT = 15;
const CREEP_PCT = 5;

function classify(changePct: number): PriceTrend["classification"] {
  if (changePct <= -CREEP_PCT) return "decrease";
  if (changePct >= SPIKE_PCT) return "spike";
  if (changePct >= CREEP_PCT) return "creep";
  return "stable";
}

/**
 * Compute price trends from snapshot history. For each (ingredient, vendor)
 * pair: baseline = earliest snapshot inside the window, current = latest.
 */
export function computePriceTrends(
  snapshots: VendorPriceSnapshot[],
  windowDays = 90,
  now = new Date()
): PriceWatchReport {
  const cutoff = new Date(now.getTime() - windowDays * 864e5);

  const byKey = new Map<string, VendorPriceSnapshot[]>();
  for (const snap of snapshots) {
    const at = new Date(snap.captured_at);
    if (Number.isNaN(at.getTime()) || at < cutoff) continue;
    if (snap.cost_cents <= 0) continue;
    const key = `${snap.ingredient_id}::${snap.vendor ?? "unknown"}`;
    const arr = byKey.get(key) ?? [];
    arr.push(snap);
    byKey.set(key, arr);
  }

  const trends: PriceTrend[] = [];
  for (const arr of byKey.values()) {
    arr.sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
    const baseline = arr[0];
    const current = arr[arr.length - 1];
    if (baseline === current) continue; // single snapshot — no trend yet

    const changeCents = current.cost_cents - baseline.cost_cents;
    const changePct = Math.round((changeCents / baseline.cost_cents) * 1000) / 10;

    trends.push({
      ingredient_id: current.ingredient_id,
      ingredient_name: current.ingredient_name ?? current.ingredient_id,
      vendor: current.vendor ?? "unknown",
      pack_size: current.pack_size,
      current_cost_cents: current.cost_cents,
      baseline_cost_cents: baseline.cost_cents,
      change_cents: changeCents,
      change_pct: changePct,
      baseline_date: baseline.captured_at,
      current_date: current.captured_at,
      classification: classify(changePct),
    });
  }

  const flagged = trends
    .filter((t) => t.classification === "creep" || t.classification === "spike")
    .sort((a, b) => b.change_pct - a.change_pct);
  const decreases = trends
    .filter((t) => t.classification === "decrease")
    .sort((a, b) => a.change_pct - b.change_pct);

  return {
    generated_at: now.toISOString(),
    window_days: windowDays,
    ingredients_analyzed: byKey.size,
    flagged,
    decreases,
    stable_count: trends.length - flagged.length - decreases.length,
  };
}

/** Human/agent-readable summary for notifications and agent responses. */
export function formatPriceWatchSummary(report: PriceWatchReport): string {
  if (report.flagged.length === 0) {
    return `Vendor price watch (${report.window_days}d): all ${report.ingredients_analyzed} tracked ingredients stable. No action needed.`;
  }
  const lines = [
    `Vendor price watch (${report.window_days}d): ${report.flagged.length} ingredient(s) rising out of ${report.ingredients_analyzed} tracked.`,
  ];
  for (const t of report.flagged.slice(0, 10)) {
    lines.push(
      `  ${t.classification === "spike" ? "SPIKE" : "creep"}: ${t.ingredient_name} (${t.vendor}) ` +
        `$${(t.baseline_cost_cents / 100).toFixed(2)} -> $${(t.current_cost_cents / 100).toFixed(2)} (+${t.change_pct}%)`
    );
  }
  if (report.decreases.length > 0) {
    lines.push(`  ${report.decreases.length} ingredient(s) got cheaper — possible savings if quality holds.`);
  }
  lines.push("Review vendors for flagged items. Switching requires owner approval.");
  return lines.join("\n");
}

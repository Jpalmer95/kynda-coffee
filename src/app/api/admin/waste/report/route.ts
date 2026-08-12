import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/waste/report
 * Aggregates waste_entries into cost reports by period + reason + category.
 * Query params:
 *   ?period=week|month|all   (default: week)
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD  (optional explicit range)
 *
 * Returns:
 *   {
 *     summary: { total_cents, total_entries, by_reason:[{reason,total_cents,count}], top_items:[...] },
 *     daily: [{date, total_cents, count}],          // last N days trend
 *     weekly: [{week_start, total_cents, count}],   // last N weeks trend
 *   }
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "week";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    let startISO: string | null = from;
    let endISO: string | null = to;

    if (!from || !to) {
      const start = new Date(now);
      if (period === "week") start.setDate(now.getDate() - 7);
      else if (period === "month") start.setMonth(now.getMonth() - 1);
      else start.setFullYear(now.getFullYear() - 1);
      startISO = start.toISOString();
      endISO = now.toISOString();
    }

    let query = supabaseAdmin()
      .from("waste_entries")
      .select("product_name, quantity, unit, reason, cost_cents, created_at, ingredient_id, unit_cost_cents")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (startISO) query = query.gte("created_at", startISO);
    if (endISO) query = query.lte("created_at", endISO);

    const { data, error } = await query;
    if (error) throw error;
    const entries = data ?? [];

    // Effective cost = stored cost_cents, else quantity * unit_cost_cents
    const effectiveCost = (e: any) =>
      e.cost_cents && e.cost_cents > 0
        ? Number(e.cost_cents)
        : Math.round((Number(e.quantity) || 0) * (Number(e.unit_cost_cents) || 0));

    // Summary
    let totalCents = 0;
    const byReason: Record<string, { reason: string; total_cents: number; count: number }> = {};
    const byItem: Record<string, { name: string; total_cents: number; count: number }> = {};

    for (const e of entries) {
      const c = effectiveCost(e);
      totalCents += c;
      const r = (byReason[e.reason] ??= { reason: e.reason, total_cents: 0, count: 0 });
      r.total_cents += c; r.count += 1;
      const nm = (byItem[e.product_name] ??= { name: e.product_name, total_cents: 0, count: 0 });
      nm.total_cents += c; nm.count += 1;
    }

    // Daily + weekly trend
    const daily: Record<string, { date: string; total_cents: number; count: number }> = {};
    const weekly: Record<string, { week_start: string; total_cents: number; count: number }> = {};
    for (const e of entries) {
      const d = new Date(e.created_at);
      const dayKey = d.toISOString().slice(0, 10);
      (daily[dayKey] ??= { date: dayKey, total_cents: 0, count: 0 });
      daily[dayKey].total_cents += effectiveCost(e); daily[dayKey].count += 1;

      const start = new Date(d); start.setDate(d.getDate() - d.getDay());
      const wk = start.toISOString().slice(0, 10);
      (weekly[wk] ??= { week_start: wk, total_cents: 0, count: 0 });
      weekly[wk].total_cents += effectiveCost(e); weekly[wk].count += 1;
    }

    return NextResponse.json({
      period,
      range: { from: startISO, to: endISO },
      summary: {
        total_cents: totalCents,
        total_entries: entries.length,
        by_reason: Object.values(byReason).sort((a, b) => b.total_cents - a.total_cents),
        top_items: Object.values(byItem).sort((a, b) => b.total_cents - a.total_cents).slice(0, 10),
      },
      daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
      weekly: Object.values(weekly).sort((a, b) => a.week_start.localeCompare(b.week_start)),
    });
  } catch (error) {
    console.error("Waste report error", error);
    return NextResponse.json({ error: "Failed to build waste report" }, { status: 500 });
  }
}

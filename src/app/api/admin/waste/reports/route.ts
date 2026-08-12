import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  expired: "Expired", spilled: "Spilled", "customer-complaint": "Customer Complaint",
  damaged: "Damaged", "over-prepared": "Over-prepared", other: "Other",
};

// Build a summary for a [from, to) date range, mirroring /api/admin/waste/report.
async function buildSummary(fromISO: string, toISO: string) {
  const { data, error } = await supabaseAdmin()
    .from("waste_entries")
    .select("product_name, quantity, unit, reason, cost_cents, created_at, unit_cost_cents")
    .gte("created_at", fromISO)
    .lt("created_at", toISO)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  const entries = data ?? [];

  const effectiveCost = (e: any) =>
    e.cost_cents && e.cost_cents > 0
      ? Number(e.cost_cents)
      : Math.round((Number(e.quantity) || 0) * (Number(e.unit_cost_cents) || 0));

  let totalCents = 0;
  const byReason: Record<string, { reason: string; total_cents: number; count: number }> = {};
  const byItem: Record<string, { name: string; total_cents: number; count: number }> = {};
  const daily: Record<string, { date: string; total_cents: number; count: number }> = {};

  for (const e of entries) {
    const c = effectiveCost(e);
    totalCents += c;
    (byReason[e.reason] ??= { reason: e.reason, total_cents: 0, count: 0 });
    byReason[e.reason].total_cents += c; byReason[e.reason].count += 1;
    (byItem[e.product_name] ??= { name: e.product_name, total_cents: 0, count: 0 });
    byItem[e.product_name].total_cents += c; byItem[e.product_name].count += 1;
    const d = e.created_at.slice(0, 10);
    (daily[d] ??= { date: d, total_cents: 0, count: 0 });
    daily[d].total_cents += c; daily[d].count += 1;
  }

  return {
    total_cents: totalCents,
    total_entries: entries.length,
    by_reason: Object.values(byReason).sort((a, b) => b.total_cents - a.total_cents),
    top_items: Object.values(byItem).sort((a, b) => b.total_cents - a.total_cents).slice(0, 10),
    daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * GET /api/admin/waste/reports — list all saved monthly reports (desc).
 * POST /api/admin/waste/reports?month=YYYY-MM — generate & save a report for that
 *   month (defaults to the current month). Upserts by month_label.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("waste_reports")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7); // YYYY-MM
    const [y, m] = month.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 1)); // exclusive
    const summary = await buildSummary(startDate.toISOString(), endDate.toISOString());

    // Human-readable reason labels in the saved report
    summary.by_reason = summary.by_reason.map((r) => ({
      ...r,
      label: REASON_LABELS[r.reason] ?? r.reason,
    }));

    const monthLabel = `${y}-${String(m).padStart(2, "0")}`;
    const payload = {
      period_start: startDate.toISOString().slice(0, 10),
      period_end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
      month_label: monthLabel,
      summary,
      generated_by: team.user.id,
    };

    const { data, error } = await supabaseAdmin()
      .from("waste_reports")
      .upsert(payload, { onConflict: "month_label" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("Save waste report error", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}

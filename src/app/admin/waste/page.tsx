"use client";

/**
 * /admin/waste — Waste cost report (weekly/monthly) with trends.
 * Aggregates waste_entries by period, reason, and item, showing real cost.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Trash2, TrendingDown, AlertTriangle, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportData {
  period: string;
  range: { from: string | null; to: string | null };
  summary: {
    total_cents: number;
    total_entries: number;
    by_reason: { reason: string; total_cents: number; count: number }[];
    top_items: { name: string; total_cents: number; count: number }[];
  };
  daily: { date: string; total_cents: number; count: number }[];
  weekly: { week_start: string; total_cents: number; count: number }[];
}

const REASON_LABELS: Record<string, string> = {
  expired: "Expired", spilled: "Spilled", "customer-complaint": "Customer Complaint",
  damaged: "Damaged", "over-prepared": "Over-prepared", other: "Other",
};

export default function AdminWasteReportPage() {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/waste/report?period=${p}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Trash2 className="h-7 w-7 text-red-600" /> Waste Cost Report
          </h1>
          <p className="text-sm text-mocha">Real cost of expired, spilled, and wasted goods — find the leaks.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Period toggle */}
      <div className="mb-6 flex gap-2">
        {["week", "month", "all"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium capitalize",
              period === p ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"
            )}
          >
            <CalendarDays className="h-4 w-4" /> {p === "all" ? "All time" : p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading report...
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-latte/20 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-mocha">Total Waste Cost</p>
              <p className="mt-1 font-heading text-3xl font-bold text-red-600">{fmt(data.summary.total_cents)}</p>
              <p className="text-xs text-mocha">{data.summary.total_entries} entries</p>
            </div>
            <div className="rounded-xl border border-latte/20 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-mocha">Top Reason</p>
              {data.summary.by_reason[0] ? (
                <>
                  <p className="mt-1 font-heading text-2xl font-bold text-espresso">
                    {REASON_LABELS[data.summary.by_reason[0].reason] ?? data.summary.by_reason[0].reason}
                  </p>
                  <p className="text-xs text-mocha">{fmt(data.summary.by_reason[0].total_cents)} · {data.summary.by_reason[0].count}×</p>
                </>
              ) : <p className="mt-1 text-mocha">—</p>}
            </div>
            <div className="rounded-xl border border-latte/20 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-mocha">Top Wasted Item</p>
              {data.summary.top_items[0] ? (
                <>
                  <p className="mt-1 font-heading text-lg font-bold text-espresso leading-snug">
                    {data.summary.top_items[0].name}
                  </p>
                  <p className="text-xs text-mocha">{fmt(data.summary.top_items[0].total_cents)} · {data.summary.top_items[0].count}×</p>
                </>
              ) : <p className="mt-1 text-mocha">—</p>}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* By reason */}
            <div className="rounded-xl border border-latte/20 bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-espresso">
                <AlertTriangle className="h-5 w-5 text-red-600" /> Waste by Reason
              </h2>
              <div className="space-y-2">
                {data.summary.by_reason.map((r) => {
                  const pct = data.summary.total_cents ? Math.round((r.total_cents / data.summary.total_cents) * 100) : 0;
                  return (
                    <div key={r.reason}>
                      <div className="flex justify-between text-sm">
                        <span className="text-espresso">{REASON_LABELS[r.reason] ?? r.reason}</span>
                        <span className="font-semibold text-espresso">{fmt(r.total_cents)} <span className="text-mocha">({pct}%)</span></span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-latte/20">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top items */}
            <div className="rounded-xl border border-latte/20 bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-espresso">
                <TrendingDown className="h-5 w-5 text-red-600" /> Top Wasted Items
              </h2>
              <ul className="space-y-2">
                {data.summary.top_items.map((it, i) => (
                  <li key={it.name} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{i + 1}</span>
                    <span className="flex-1 text-espresso">{it.name}</span>
                    <span className="font-semibold text-espresso">{fmt(it.total_cents)}</span>
                    <span className="text-xs text-mocha">×{it.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Weekly trend */}
          <div className="rounded-xl border border-latte/20 bg-card p-5">
            <h2 className="mb-3 font-heading text-lg font-bold text-espresso">Weekly Trend</h2>
            {data.weekly.length ? (
              <div className="flex items-end gap-2" style={{ minHeight: 120 }}>
                {data.weekly.slice(-8).map((w) => {
                  const h = data.weekly.length ? Math.max(8, Math.round((w.total_cents / Math.max(...data.weekly.map((x) => x.total_cents), 1)) * 100)) : 8;
                  return (
                    <div key={w.week_start} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-mocha">{fmt(w.total_cents)}</span>
                      <div className="w-full rounded-t bg-red-500/80" style={{ height: `${h}px` }} />
                      <span className="text-[10px] text-mocha">{w.week_start.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-mocha">No waste in this period.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

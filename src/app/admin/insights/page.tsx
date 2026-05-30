"use client";

// /admin/insights — Growth Insights: prioritized, actionable recommendations
// derived from sales + marketing + ops signals.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Severity = "critical" | "warning" | "opportunity" | "positive";

interface Insight {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  action?: string;
  href?: string;
  impact: number;
}

interface Signals {
  revenue_30d: number;
  cafe_revenue_30d: number;
  merch_revenue_30d: number;
  live_specials: number;
  pending_approvals: number;
  active_subscribers: number;
  last_newsletter_days_ago: number | null;
  low_stock: number;
  top_products: { name: string; units: number; revenue: number }[];
}

const SEV: Record<Severity, { icon: typeof AlertTriangle; cls: string; ring: string; label: string }> = {
  critical: { icon: AlertCircle, cls: "text-red-600", ring: "border-red-200 bg-red-50", label: "Needs attention" },
  warning: { icon: AlertTriangle, cls: "text-amber-600", ring: "border-amber-200 bg-amber-50", label: "Watch" },
  opportunity: { icon: Lightbulb, cls: "text-forest", ring: "border-forest/20 bg-forest/5", label: "Opportunity" },
  positive: { icon: CheckCircle2, cls: "text-sage", ring: "border-sage/20 bg-sage/5", label: "Going well" },
};

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [signals, setSignals] = useState<Signals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/insights", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setInsights(data.insights ?? []);
      setSignals(data.signals ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to admin">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <TrendingUp className="h-7 w-7 text-forest" /> Growth Insights
          </h1>
          <p className="text-sm text-mocha">What to do next, ranked by impact — from your sales, marketing, and ops signals.</p>
        </div>
        <button onClick={load} className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Refresh">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Signal strip */}
      {signals && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "30-day revenue", value: money(signals.revenue_30d) },
            { label: "Café", value: money(signals.cafe_revenue_30d) },
            { label: "Merch / POD", value: money(signals.merch_revenue_30d) },
            { label: "Live specials", value: String(signals.live_specials) },
            { label: "Subscribers", value: String(signals.active_subscribers) },
            { label: "Drafts to approve", value: String(signals.pending_approvals) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-latte/20 bg-card p-4">
              <p className="text-xs text-mocha">{s.label}</p>
              <p className="mt-1 font-heading text-xl font-bold text-espresso">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Crunching signals…</div>
      ) : insights.length === 0 ? (
        <div className="rounded-2xl border border-sage/20 bg-sage/5 py-16 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-sage" />
          <p className="font-heading text-lg font-semibold text-espresso">All clear — nothing urgent right now.</p>
          <p className="mt-1 text-sm text-mocha">Revenue steady, queues clear, marketing on track. Keep it up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((i) => {
            const meta = SEV[i.severity];
            const Icon = meta.icon;
            return (
              <div key={i.id} className={`flex items-start gap-4 rounded-2xl border p-4 ${meta.ring}`}>
                <Icon className={`mt-0.5 h-6 w-6 flex-shrink-0 ${meta.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-espresso">{i.title}</h3>
                    <span className={`rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-mocha">{i.detail}</p>
                  {i.action && <p className="mt-1 text-sm font-medium text-espresso">→ {i.action}</p>}
                </div>
                {i.href && (
                  <Link href={i.href} className="btn-secondary flex-shrink-0 text-sm">
                    Go <ArrowRight className="ml-1 inline h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {signals && signals.top_products.length > 0 && (
        <div className="mt-8 rounded-2xl border border-latte/20 bg-card p-6">
          <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Top sellers (30 days)</h2>
          <div className="space-y-2">
            {signals.top_products.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-espresso">{idx + 1}. {p.name}</span>
                <span className="text-mocha">{p.units} sold · {money(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

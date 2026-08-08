"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Mail,
  AlertTriangle,
  Sparkles,
  Inbox,
  Package,
  Briefcase,
  CalendarDays,
  Share2,
  Brain,
  ArrowUpRight,
  Zap,
  Loader2,
  ListChecks,
  Gift,
  GraduationCap,
  Building2,
} from "lucide-react";

/**
 * Command & Control Center (Roadmap V2 — Epic 13).
 * One screen: how is the business doing right now, and what needs attention?
 * Aggregates existing admin APIs with graceful degradation per section.
 */

interface Stats {
  generated_at?: string;
  today_revenue_cents: number;
  today_orders: number;
  total_customers: number;
  active_products: number;
  newsletter_subscribers: number;
  revenue_7d_cents?: number;
  revenue_prev_7d_cents?: number;
  revenue_30d_cents?: number;
  wow_growth_pct?: number | null;
  pending_marketing_approvals?: number;
  open_inventory_alerts?: number;
  new_b2b_leads?: number;
  pending_schedule_requests?: number;
  upcoming_specials?: { id: string; title: string; starts_at: string | null; ends_at: string | null }[];
}

interface InboxCounts {
  applications_new: number;
  catering_new: number;
  contact_new: number;
  total: number;
}

interface PlatformStatus {
  key: string;
  name: string;
  configured: boolean;
}

interface SocialPost {
  id: string;
  platform: string;
  status: string;
}

interface Insight {
  id: string;
  severity: "critical" | "warning" | "opportunity" | "positive";
  title: string;
  detail: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, opportunity: 2, positive: 3 };

const money = (cents?: number | null) =>
  cents == null ? "—" : `$${(cents / 100).toFixed(2)}`;

export default function CommandCenterPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [inbox, setInbox] = useState<InboxCounts | null>(null);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [postTallies, setPostTallies] = useState<Record<string, number>>({});
  const [insights, setInsights] = useState<Insight[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; units: number; revenue: number }[]>([]);
  const [liveSpecials, setLiveSpecials] = useState(0);
  const [loopRunning, setLoopRunning] = useState(false);
  const [loopResult, setLoopResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Each fetch fails soft — a broken API degrades that section, never the page.
    const [statsRes, inboxRes, postsRes, insightsRes, specialsRes] = await Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/admin/inbox/counts", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/marketing/social/posts?limit=200", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/admin/insights", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/admin/specials", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ]);

    if (statsRes && !statsRes.error) setStats(statsRes);
    if (inboxRes && !inboxRes.error) setInbox(inboxRes);

    if (postsRes && Array.isArray(postsRes.platforms)) setPlatforms(postsRes.platforms);
    if (postsRes && Array.isArray(postsRes.posts)) {
      const tallies: Record<string, number> = {};
      for (const p of postsRes.posts as SocialPost[]) {
        tallies[p.status] = (tallies[p.status] ?? 0) + 1;
      }
      setPostTallies(tallies);
    }

    if (insightsRes && Array.isArray(insightsRes.insights)) {
      const sorted = [...(insightsRes.insights as Insight[])].sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      );
      setInsights(sorted.slice(0, 4));
    }
    if (insightsRes?.signals?.top_products) {
      setTopProducts(insightsRes.signals.top_products.slice(0, 5));
    }

    if (specialsRes && Array.isArray(specialsRes.specials)) {
      setLiveSpecials(specialsRes.specials.filter((s: any) => s.is_active).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runMarketingLoop() {
    setLoopRunning(true);
    setLoopResult(null);
    try {
      const res = await fetch("/api/marketing/loop/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Loop failed");
      const drafts = data.draftsCreated ?? data.drafts_created ?? 0;
      setLoopResult(`Done — ${drafts} draft(s) created. Check the approval queue.`);
      await load();
    } catch (e) {
      setLoopResult(e instanceof Error ? e.message : "Loop failed");
    } finally {
      setLoopRunning(false);
    }
  }

  const attention = [
    {
      label: "Marketing approvals",
      count: stats?.pending_marketing_approvals ?? 0,
      href: "/admin/marketing/approvals",
      icon: Share2,
      critical: (stats?.pending_marketing_approvals ?? 0) > 0,
    },
    {
      label: "Inbox items",
      count: inbox?.total ?? 0,
      href: "/admin/inbox",
      icon: Inbox,
      critical: (inbox?.total ?? 0) > 0,
    },
    {
      label: "Inventory alerts",
      count: stats?.open_inventory_alerts ?? 0,
      href: "/admin/inventory",
      icon: Package,
      critical: (stats?.open_inventory_alerts ?? 0) > 0,
    },
    {
      label: "B2B leads",
      count: stats?.new_b2b_leads ?? 0,
      href: "/admin/b2b",
      icon: Briefcase,
      critical: (stats?.new_b2b_leads ?? 0) > 0,
    },
    {
      label: "Live specials",
      count: liveSpecials,
      href: "/admin/specials",
      icon: Sparkles,
      critical: liveSpecials === 0,
    },
  ];

  const quickActions = [
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/marketing", label: "Marketing", icon: Share2 },
    { href: "/admin/strategist", label: "AI Strategist", icon: Brain },
    { href: "/admin/inventory", label: "Inventory", icon: Package },
    { href: "/admin/b2b", label: "B2B / Wholesale", icon: Building2 },
    { href: "/admin/specials", label: "Specials", icon: Sparkles },
    { href: "/admin/designs/studio", label: "Design Studio", icon: Zap },
    { href: "/admin/training", label: "Training", icon: GraduationCap },
    { href: "/admin/promo-codes", label: "Promo Codes", icon: Gift },
  ];

  const wow = stats?.wow_growth_pct;
  const wowColor = wow == null ? "text-mocha" : wow >= 0 ? "text-sage" : "text-red-600";

  const vitals = [
    { label: "Today's Revenue", value: money(stats?.today_revenue_cents), icon: DollarSign, sub: `${stats?.today_orders ?? 0} orders` },
    { label: "Last 7 Days", value: money(stats?.revenue_7d_cents), icon: TrendingUp, sub: wow == null ? "vs prior week —" : `vs prior week ${wow >= 0 ? "+" : ""}${wow}%` },
    { label: "Last 30 Days", value: money(stats?.revenue_30d_cents), icon: TrendingUp, sub: "trailing revenue" },
    { label: "Customers", value: String(stats?.total_customers ?? 0), icon: Users, sub: `${stats?.active_products ?? 0} active products` },
    { label: "Subscribers", value: String(stats?.newsletter_subscribers ?? 0), icon: Mail, sub: "newsletter list" },
    { label: "Pending Drafts", value: String(postTallies.pending_approval ?? 0), icon: Share2, sub: `${postTallies.scheduled ?? 0} scheduled · ${postTallies.published ?? 0} published` },
  ];

  return (
    <div className="container-max py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Zap className="h-7 w-7 text-forest" /> Command Center
          </h1>
          <p className="mt-1 text-sm text-mocha">
            How the business is doing right now — and what needs your attention.
            {stats && (
              <span className="ml-2 text-xs text-mocha/60">
                Updated {new Date(stats.generated_at ?? Date.now()).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={runMarketingLoop}
          disabled={loopRunning}
          className="btn-primary text-sm disabled:opacity-60"
          title="Generate draft campaigns from live specials"
        >
          {loopRunning ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 inline h-4 w-4" />}
          Run Marketing Loop
        </button>
      </div>

      {loopResult && (
        <div className={`mb-6 rounded-2xl border p-4 text-sm ${loopResult.startsWith("Done") ? "border-sage/40 bg-sage/10 text-forest" : "border-red-200 bg-red-50 text-red-700"}`}>
          {loopResult}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading business snapshot…
        </div>
      ) : (
        <>
          {/* Vitals strip */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {vitals.map((v) => (
              <div key={v.label} className="rounded-2xl border border-latte/20 bg-card p-4">
                <div className="flex items-center gap-2 text-mocha">
                  <v.icon className="h-4 w-4 text-forest" />
                  <span className="text-xs font-medium uppercase tracking-wide">{v.label}</span>
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-espresso">{v.value}</div>
                <div className={`mt-1 text-xs ${v.label === "Last 7 Days" ? wowColor : "text-mocha/70"}`}>{v.sub}</div>
              </div>
            ))}
          </div>

          {/* Attention queue */}
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-bold text-espresso">
              <AlertTriangle className="h-5 w-5 text-bronze" /> Attention Queue
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {attention.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`group flex items-center justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    a.critical ? "border-bronze/40 bg-bronze/5" : "border-latte/20 bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-espresso">
                      <a.icon className={`h-4 w-4 ${a.critical ? "text-bronze" : "text-mocha"}`} />
                      {a.label}
                    </div>
                    <div className={`mt-1 font-heading text-2xl font-bold ${a.critical ? "text-bronze" : "text-espresso"}`}>
                      {a.count}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-mocha opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Marketing pulse */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-bold text-espresso">
                <Share2 className="h-5 w-5 text-forest" /> Marketing Pulse
              </h2>
              <div className="rounded-2xl border border-latte/20 bg-card p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  {platforms.length === 0 ? (
                    <span className="text-sm text-mocha">No platform status available.</span>
                  ) : (
                    platforms.map((p) => (
                      <span
                        key={p.key}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          p.configured ? "bg-sage/15 text-sage" : "bg-latte/20 text-mocha"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${p.configured ? "bg-sage" : "bg-mocha/40"}`} />
                        {p.name}
                      </span>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-latte/10 p-3">
                    <div className="font-heading text-2xl font-bold text-espresso">{postTallies.pending_approval ?? 0}</div>
                    <div className="text-xs text-mocha">Awaiting approval</div>
                  </div>
                  <div className="rounded-xl bg-latte/10 p-3">
                    <div className="font-heading text-2xl font-bold text-espresso">{postTallies.scheduled ?? 0}</div>
                    <div className="text-xs text-mocha">Scheduled</div>
                  </div>
                  <div className="rounded-xl bg-latte/10 p-3">
                    <div className="font-heading text-2xl font-bold text-espresso">{postTallies.published ?? 0}</div>
                    <div className="text-xs text-mocha">Published</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-mocha">
                  Only Bluesky is wired to publish until platform credentials are added in Coolify — see
                  MARKETING-CRON-PIPELINE.md for the rollout order.
                </p>
                <Link href="/admin/marketing/dashboard" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">
                  Open marketing dashboard <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Growth vectors */}
              <h2 className="mb-3 mt-8 flex items-center gap-2 font-heading text-xl font-bold text-espresso">
                <TrendingUp className="h-5 w-5 text-forest" /> Growth Vectors
              </h2>
              <div className="rounded-2xl border border-latte/20 bg-card p-5">
                <h3 className="text-sm font-semibold text-espresso">Top sellers (30d)</h3>
                {topProducts.length === 0 ? (
                  <p className="mt-2 text-sm text-mocha">No sales data yet.</p>
                ) : (
                  <ol className="mt-2 space-y-1.5">
                    {topProducts.map((p, i) => (
                      <li key={p.name} className="flex items-center justify-between text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-espresso">
                          <span className="text-xs text-mocha">{i + 1}.</span>
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span className="ml-3 flex-shrink-0 text-xs text-mocha">
                          {p.units} sold · {money(p.revenue)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/admin/b2b" className="rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/20">
                    Wholesale pipeline →
                  </Link>
                  <Link href="/admin/analytics" className="rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/20">
                    Analytics →
                  </Link>
                  <Link href="/admin/data-export" className="rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/20">
                    Data export →
                  </Link>
                </div>
              </div>
            </section>

            {/* AI recommendations + quick actions */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-bold text-espresso">
                <Brain className="h-5 w-5 text-forest" /> AI Recommendations
              </h2>
              <div className="space-y-3">
                {insights.length === 0 ? (
                  <div className="rounded-2xl border border-latte/20 bg-card p-5 text-sm text-mocha">
                    No recommendations yet — they appear as data accumulates.
                  </div>
                ) : (
                  insights.map((ins) => (
                    <div key={ins.id} className="rounded-2xl border border-latte/20 bg-card p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            ins.severity === "critical"
                              ? "bg-red-100 text-red-700"
                              : ins.severity === "warning"
                                ? "bg-bronze/15 text-bronze"
                                : ins.severity === "opportunity"
                                  ? "bg-forest/10 text-forest"
                                  : "bg-sage/15 text-sage"
                          }`}
                        >
                          {ins.severity}
                        </span>
                        <h3 className="text-sm font-semibold text-espresso">{ins.title}</h3>
                      </div>
                      <p className="mt-1.5 text-sm text-mocha">{ins.detail}</p>
                    </div>
                  ))
                )}
                <Link href="/admin/insights" className="inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">
                  All growth insights <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Quick actions */}
              <h2 className="mb-3 mt-8 flex items-center gap-2 font-heading text-xl font-bold text-espresso">
                <ListChecks className="h-5 w-5 text-forest" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickActions.map((qa) => (
                  <Link
                    key={qa.href}
                    href={qa.href}
                    className="flex items-center gap-2 rounded-xl border border-latte/20 bg-card px-3 py-2.5 text-sm font-medium text-espresso transition hover:border-forest/40 hover:bg-forest/5"
                  >
                    <qa.icon className="h-4 w-4 text-forest" />
                    <span className="truncate">{qa.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

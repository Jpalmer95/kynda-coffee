"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Palette,
  RefreshCw,
  Megaphone,
  Settings,
  GraduationCap,
  DollarSign,
  Users,
  Box,
  Mail,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Inbox,
  Database,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface AdminStats {
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

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sections = [
    {
      href: "/admin/analytics",
      label: "Analytics",
      desc: "Revenue charts, top products, and growth trends",
      icon: TrendingUp,
    },
    {
      href: "/admin/products",
      label: "Products",
      desc: "Manage catalog, prices, inventory",
      icon: Package,
    },
    {
      href: "/admin/orders",
      label: "Orders",
      desc: "View and manage all orders",
      icon: ShoppingCart,
    },
    {
      href: "/admin/designs",
      label: "AI Designs",
      desc: "Review and publish AI-generated designs",
      icon: Palette,
    },
    {
      href: "/admin/square",
      label: "Square Sync",
      desc: "Sync POS catalog, inventory, and orders",
      icon: RefreshCw,
    },
    {
      href: "/admin/customers",
      label: "Customers",
      desc: "View customer list and order history",
      icon: Users,
    },
    {
      href: "/admin/insights",
      label: "Growth Insights",
      desc: "Ranked, actionable recommendations from your data",
      icon: TrendingUp,
    },
    {
      href: "/admin/inbox",
      label: "Inbox",
      desc: "Contact form messages — read, reply, and triage",
      icon: Inbox,
    },
    {
      href: "/admin/data-export",
      label: "Data Export",
      desc: "Own your data — download CSV or a full JSON bundle",
      icon: Database,
    },
    {
      href: "/admin/marketing",
      label: "Marketing Agent",
      desc: "AI-powered email, SMS, and social campaigns",
      icon: Megaphone,
    },
    {
      href: "/admin/specials",
      label: "Monthly Specials",
      desc: "Feature specials at the top of the Menu + seed campaigns",
      icon: Sparkles,
    },
    {
      href: "/admin/training",
      label: "Team Training",
      desc: "Employee progress and course management",
      icon: GraduationCap,
    },
  ];

  const statCards = [
    {
      label: "Today's Revenue",
      value: stats ? formatPrice(stats.today_revenue_cents) : "$—",
      icon: DollarSign,
      loading,
      color: "text-espresso",
    },
    {
      label: "Today's Orders",
      value: stats ? String(stats.today_orders) : "—",
      icon: ShoppingCart,
      loading,
      color: "text-espresso",
    },
    {
      label: "Customers",
      value: stats ? String(stats.total_customers) : "—",
      icon: Users,
      loading,
      color: "text-espresso",
      href: "/admin/customers",
    },
    {
      label: "Active Products",
      value: stats ? String(stats.active_products) : "—",
      icon: Box,
      loading,
      color: "text-espresso",
    },
    {
      label: "Subscribers",
      value: stats ? String(stats.newsletter_subscribers) : "—",
      icon: Mail,
      loading,
      color: "text-espresso",
    },
    {
      label: "7-Day Revenue",
      value: stats ? formatPrice(stats.revenue_7d_cents ?? 0) : "$—",
      icon: TrendingUp,
      loading,
      color: "text-espresso",
      sub:
        stats?.wow_growth_pct != null
          ? `${stats.wow_growth_pct >= 0 ? "▲" : "▼"} ${Math.abs(stats.wow_growth_pct)}% vs last wk`
          : undefined,
      subTone: stats?.wow_growth_pct != null && stats.wow_growth_pct < 0 ? "down" : "up",
    },
    {
      label: "Avg Order",
      value: stats && stats.today_orders > 0
        ? formatPrice(Math.round(stats.today_revenue_cents / stats.today_orders))
        : "$—",
      icon: TrendingUp,
      loading,
      color: "text-espresso",
    },
  ];

  // Needs-attention items: only render the ones with a non-zero count.
  const attention = stats
    ? ([
        {
          count: stats.pending_schedule_requests ?? 0,
          label: "schedule request",
          href: "/admin/schedule",
        },
        {
          count: stats.pending_marketing_approvals ?? 0,
          label: "marketing draft awaiting approval",
          href: "/admin/marketing/approvals",
        },
        {
          count: stats.open_inventory_alerts ?? 0,
          label: "inventory alert",
          href: "/admin/inventory",
        },
        {
          count: stats.new_b2b_leads ?? 0,
          label: "new wholesale lead",
          href: "/admin/b2b",
        },
      ].filter((a) => a.count > 0))
    : [];

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 sm:h-8 sm:w-8 text-sand" aria-hidden="true" />
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-sand">
              Dashboard
            </h1>
            <p className="text-sm text-sand-50/70 tracking-widest font-body uppercase">Overview & Quick Access</p>
          </div>
        </div>

        {/* Needs Attention */}
        {attention.length > 0 && (
          <div className="mb-6 rounded-[12px] border border-bronze/40 bg-bronze/10 p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-bronze">Needs Attention</h2>
            <div className="flex flex-wrap gap-2">
              {attention.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-full border border-bronze/40 bg-surface-card px-4 py-1.5 text-sm text-sand transition-colors hover:border-bronze"
                >
                  <span className="font-bold">{a.count}</span> {a.label}{a.count === 1 ? "" : "s"} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming specials reminder */}
        {stats?.upcoming_specials && stats.upcoming_specials.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-sand-50/80">
            <Sparkles className="h-4 w-4 text-forest" aria-hidden="true" />
            <span className="font-medium text-sand">Live / upcoming specials:</span>
            {stats.upcoming_specials.map((s) => (
              <Link key={s.id} href="/admin/specials" className="rounded-full bg-surface-card border border-latte px-3 py-1 hover:border-forest/50">
                {s.title}
              </Link>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 sm:mb-10 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {statCards.map((stat) => {
            const CardWrapper = stat.href ? Link : "div";
            return (
              <CardWrapper
                key={stat.label}
                href={stat.href || ""}
                className={`rounded-[12px] border border-latte bg-[url("/noise.png")] bg-surface-card p-4 sm:p-5 ${stat.href ? "transition-all hover:-translate-y-1 dark:hover:shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:border-forest/40 cursor-pointer" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <stat.icon className="h-4 w-4 text-mocha-400" aria-hidden="true" />
                  {!stat.loading && <ArrowUpRight className="h-3.5 w-3.5 text-forest" aria-hidden="true" />}
                </div>
                <p className="mt-4 text-xs sm:text-sm font-medium tracking-[0.05em] text-mocha uppercase">{stat.label}</p>
                <p className={`mt-1 font-heading text-2xl sm:text-3xl font-bold text-sand`}>
                  {stat.loading ? (
                    <span className="inline-block h-6 w-16 animate-pulse rounded bg-latte/20" />
                  ) : (
                    stat.value
                  )}
                </p>
                {"sub" in stat && stat.sub && !stat.loading && (
                  <p className={`mt-1 text-xs font-medium ${stat.subTone === "down" ? "text-red-400" : "text-forest"}`}>
                    {stat.sub}
                  </p>
                )}
              </CardWrapper>
            );
          })}
        </div>

        {/* Quick Links */}
        <h2 className="mb-4 mt-12 font-heading text-xl font-bold text-sand tracking-wide uppercase">
          Quick Access
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col items-start rounded-[12px] border border-latte bg-surface-card bg-[url('/noise.png')] p-6 transition-all hover:border-forest/50 hover:-translate-y-1 dark:hover:shadow-[0_0_20px_rgba(74,222,128,0.15)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[4px] bg-[cream-200] border border-latte transition-colors group-hover:bg-forest/10 group-hover:border-forest/30">
                <section.icon className="h-5 w-5 text-latte-500 transition-colors group-hover:text-forest dark:text-latte-500 dark:group-hover:text-forest" aria-hidden="true" />
              </div>
              <div className="mt-5">
                <h2 className="font-heading text-lg font-bold text-sand group-hover:text-white transition-colors">
                  {section.label}
                </h2>
                <p className="mt-1 text-sm text-sand-50/70">{section.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

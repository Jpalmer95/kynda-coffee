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
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface AdminStats {
  today_revenue_cents: number;
  today_orders: number;
  total_customers: number;
  active_products: number;
  newsletter_subscribers: number;
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
      label: "Avg Order",
      value: stats && stats.today_orders > 0
        ? formatPrice(Math.round(stats.today_revenue_cents / stats.today_orders))
        : "$—",
      icon: TrendingUp,
      loading,
      color: "text-espresso",
    },
  ];

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

        {/* Stats Grid */}
        <div className="mb-8 sm:mb-10 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

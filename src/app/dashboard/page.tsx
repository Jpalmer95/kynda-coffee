"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Sparkles,
  ArrowRight,
  Target,
  Heart,
  Lightbulb,
  ChevronRight,
  Coffee,
  Megaphone,
  BookOpen,
  CheckSquare,
  RefreshCw,
  Star,
  Zap,
  Calendar,
} from "lucide-react";

// ---- Types ----

interface Metric {
  label: string;
  value: string;
  change: number; // percentage
  icon: typeof DollarSign;
  color: string;
}

interface Nudge {
  id: string;
  type: "marketing" | "operations" | "growth" | "kaizen" | "encouragement";
  title: string;
  description: string;
  action_label?: string;
  action_url?: string;
  priority: "low" | "normal" | "high";
}

// ---- Mock Data (would come from Supabase) ----

const METRICS: Metric[] = [
  {
    label: "Today's Revenue",
    value: "$847",
    change: 12,
    icon: DollarSign,
    color: "text-sage",
  },
  {
    label: "Orders Today",
    value: "43",
    change: 8,
    icon: ShoppingCart,
    color: "text-rust",
  },
  {
    label: "Avg Order Value",
    value: "$19.70",
    change: -3,
    icon: TrendingUp,
    color: "text-espresso",
  },
  {
    label: "New Customers",
    value: "7",
    change: 25,
    icon: Users,
    color: "text-mocha",
  },
];

const NUDGES: Nudge[] = [
  {
    id: "1",
    type: "kaizen",
    title: "Small Win Opportunity",
    description:
      "Your Sunrise Light roast hasn't been featured in 2 weeks. Feature it on Instagram this week — it's your highest-margin bean!",
    action_label: "Draft a post",
    action_url: "/dashboard/marketing",
    priority: "normal",
  },
  {
    id: "2",
    type: "marketing",
    title: "Email List Growing",
    description:
      "You've gained 12 new subscribers this week. Time for a welcome email blast with your 10% off code!",
    action_label: "Create campaign",
    action_url: "/dashboard/marketing",
    priority: "high",
  },
  {
    id: "3",
    type: "growth",
    title: "Merch Opportunity",
    description:
      "Your Ceramic Mug has been viewed 47 times but only purchased 3 times. Consider adding customer photos or reviews to the product page.",
    action_label: "View product",
    action_url: "/shop/product/kynda-ceramic-mug",
    priority: "normal",
  },
  {
    id: "4",
    type: "encouragement",
    title: "You're Doing Great",
    description:
      "6 years in, steady growth, zero outside funding. That's something to be proud of. Keep showing up — your community notices.",
    priority: "low",
  },
  {
    id: "5",
    type: "operations",
    title: "Inventory Alert",
    description:
      "Kynda Espresso is running low (12 units). Consider reordering from your supplier this week.",
    action_label: "Update inventory",
    action_url: "/admin/products",
    priority: "high",
  },
];

const QUICK_LINKS = [
  {
    href: "/dashboard/marketing",
    label: "Marketing Studio",
    desc: "AI agent, content library, campaigns",
    icon: Megaphone,
    color: "bg-rust/10 text-rust",
  },
  {
    href: "/training",
    label: "Team Portal",
    desc: "Training, SOPs, checklists",
    icon: BookOpen,
    color: "bg-sage/10 text-sage",
  },
  {
    href: "/admin/square",
    label: "Square Sync",
    desc: "POS inventory and orders",
    icon: RefreshCw,
    color: "bg-mocha/10 text-mocha",
  },
  {
    href: "/studio",
    label: "Design Studio",
    desc: "AI merch creation",
    icon: Sparkles,
    color: "bg-espresso/10 text-espresso",
  },
];

// ---- Components ----

function MetricCard({ metric }: { metric: Metric }) {
  const isUp = metric.change > 0;
  return (
    <div className="rounded-xl border border-latte/20 bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mocha">{metric.label}</p>
        <div className={`rounded-lg bg-cream p-2 ${metric.color}`}>
          <metric.icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 font-heading text-3xl font-bold text-espresso">
        {metric.value}
      </p>
      <div className="mt-2 flex items-center gap-1">
        {isUp ? (
          <TrendingUp className="h-3 w-3 text-sage" />
        ) : (
          <TrendingDown className="h-3 w-3 text-rust" />
        )}
        <span
          className={`text-xs font-medium ${
            isUp ? "text-sage" : "text-rust"
          }`}
        >
          {isUp ? "+" : ""}
          {metric.change}%
        </span>
        <span className="text-xs text-mocha/60">vs yesterday</span>
      </div>
    </div>
  );
}

function NudgeCard({ nudge }: { nudge: Nudge }) {
  const typeConfig = {
    kaizen: { icon: Zap, color: "text-rust", bg: "bg-rust/10", label: "Kaizen" },
    marketing: {
      icon: Megaphone,
      color: "text-sage",
      bg: "bg-sage/10",
      label: "Marketing",
    },
    growth: {
      icon: TrendingUp,
      color: "text-espresso",
      bg: "bg-espresso/10",
      label: "Growth",
    },
    operations: {
      icon: CheckSquare,
      color: "text-mocha",
      bg: "bg-mocha/10",
      label: "Operations",
    },
    encouragement: {
      icon: Heart,
      color: "text-rust",
      bg: "bg-rust/10",
      label: "Keep Going",
    },
  };

  const config = typeConfig[nudge.type];

  return (
    <div
      className={`rounded-xl border p-5 transition-all hover:shadow-md ${
        nudge.priority === "high"
          ? "border-rust/30 bg-rust/5"
          : "border-latte/20 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${config.bg}`}>
          <config.icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-espresso">
              {nudge.title}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-mocha">{nudge.description}</p>
          {nudge.action_label && nudge.action_url && (
            <Link
              href={nudge.action_url}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-rust transition-colors hover:text-espresso"
            >
              {nudge.action_label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today");

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-heading text-3xl font-bold text-espresso">
              Good morning ☕
            </h1>
            <p className="mt-1 text-mocha">
              Here&apos;s how Kynda Coffee is doing today.
            </p>
          </div>
          <div className="flex gap-2">
            {["today", "week", "month"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedPeriod === period
                    ? "bg-espresso text-cream"
                    : "bg-latte/20 text-mocha hover:bg-latte/40"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Left: AI Nudges / Mentor */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-rust" />
              <h2 className="font-heading text-xl font-semibold text-espresso">
                AI Business Mentor
              </h2>
            </div>
            <p className="mb-6 text-sm text-mocha">
              Personalized nudges for continuous improvement. Small steps, big
              impact.
            </p>
            <div className="space-y-4">
              {NUDGES.map((nudge) => (
                <NudgeCard key={nudge.id} nudge={nudge} />
              ))}
            </div>
          </div>

          {/* Right: Quick Links + Daily Motivation */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="rounded-xl border border-latte/20 bg-white p-6">
              <h2 className="font-heading text-lg font-semibold text-espresso">
                Quick Access
              </h2>
              <div className="mt-4 space-y-2">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:bg-cream"
                  >
                    <div className={`rounded-lg p-2 ${link.color}`}>
                      <link.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-espresso group-hover:text-rust transition-colors">
                        {link.label}
                      </p>
                      <p className="text-xs text-mocha">{link.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-latte group-hover:text-espresso transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Daily Motivation */}
            <div className="rounded-xl border border-rust/20 bg-gradient-to-br from-rust/5 to-cream p-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-rust" />
                <h2 className="font-heading text-lg font-semibold text-espresso">
                  Daily Boost
                </h2>
              </div>
              <blockquote className="mt-4 border-l-2 border-rust/30 pl-4">
                <p className="font-heading text-lg italic text-espresso">
                  &ldquo;Every expert was once a beginner. Every pro was once an
                  amateur. Every icon was once unknown.&rdquo;
                </p>
              </blockquote>
              <p className="mt-4 text-sm text-mocha">
                You&apos;ve built something real from nothing. That takes grit.
                Today, focus on one small improvement — for your team, your
                customers, or yourself.
              </p>
            </div>

            {/* This Week */}
            <div className="rounded-xl border border-latte/20 bg-white p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-mocha" />
                <h2 className="font-heading text-lg font-semibold text-espresso">
                  This Week
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sage" />
                  <span className="text-mocha">Post on Instagram (3x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rust" />
                  <span className="text-mocha">Send welcome email to new subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-mocha" />
                  <span className="text-mocha">Review Square inventory sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-latte" />
                  <span className="text-mocha">Feature Sunrise Light on social</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

// /admin/marketing/dashboard — Unified Marketing Command Center
// Ties together: pipeline stats, growth insights, platform status, trending feed,
// quick actions. Single page to see the whole marketing operation at a glance.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Bot,
  ImageIcon,
  Share2,
  ShieldCheck,
  Calendar,
  Send,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface PipelineStats {
  pending_approval: number;
  scheduled: number;
  published: number;
  draft: number;
  failed: number;
  total: number;
}

interface PlatformStatus {
  key: string;
  name: string;
  configured: boolean;
}

interface Insight {
  id: string;
  severity: string;
  title: string;
  detail: string;
  action?: string;
  href?: string;
  impact: number;
}

interface DashboardData {
  pipeline: PipelineStats;
  platforms: PlatformStatus[];
  insights: Insight[];
  recentPublished: Array<{ id: string; platform: string; text: string; published_at: string }>;
}

export default function MarketingDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningLoop, setRunningLoop] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Use the existing admin APIs for pipeline + platform data
      const [pipelineRes, platformsRes] = await Promise.all([
        fetch("/api/admin/marketing/approvals?status=all&limit=200", { cache: "no-store" }),
        fetch("/api/marketing/social/posts", { cache: "no-store" }).catch(() => null),
      ]);

      const pipelineData = await pipelineRes.json();
      const allPosts = pipelineData.posts || [];

      let platforms: PlatformStatus[] = [];
      if (platformsRes && platformsRes.ok) {
        const platformsData = await platformsRes.json();
        platforms = platformsData.platforms || [];
      }

      const recentPublished = allPosts
        .filter((p: { status: string }) => p.status === "published")
        .slice(0, 5)
        .map((p: { id: string; platform: string; text: string; published_at: string }) => ({
          id: p.id,
          platform: p.platform,
          text: p.text,
          published_at: p.published_at,
        }));

      setData({
        pipeline: {
          total: allPosts.length,
          pending_approval: allPosts.filter((p: { status: string }) => p.status === "pending_approval").length,
          scheduled: allPosts.filter((p: { status: string }) => p.status === "scheduled").length,
          published: allPosts.filter((p: { status: string }) => p.status === "published").length,
          draft: allPosts.filter((p: { status: string }) => p.status === "draft").length,
          failed: allPosts.filter((p: { status: string }) => p.status === "failed").length,
        },
        platforms,
        insights: [],
        recentPublished,
      });
    } catch {
      toast("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function runMarketingLoop() {
    setRunningLoop(true);
    try {
      const res = await fetch("/api/marketing/loop/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message || "Marketing loop complete — drafts in approval queue", "success");
        await load();
      } else {
        toast(data.error || "Loop failed", "error");
      }
    } catch {
      toast("Failed to trigger marketing loop", "error");
    } finally {
      setRunningLoop(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-mocha">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading marketing dashboard…
      </div>
    );
  }

  const pipelineStages = [
    { label: "Drafts", value: data?.pipeline.draft ?? 0, icon: Calendar, color: "text-mocha", href: "/admin/marketing/social" },
    { label: "Needs Approval", value: data?.pipeline.pending_approval ?? 0, icon: ShieldCheck, color: "text-clay", href: "/admin/marketing/approvals" },
    { label: "Scheduled", value: data?.pipeline.scheduled ?? 0, icon: Clock, color: "text-sage", href: "/admin/marketing/social" },
    { label: "Published", value: data?.pipeline.published ?? 0, icon: CheckCircle, color: "text-forest", href: "/admin/marketing/social" },
    { label: "Failed", value: data?.pipeline.failed ?? 0, icon: AlertCircle, color: "text-red-600", href: "/admin/marketing/approvals?status=rejected" },
  ];

  const quickActions = [
    { label: "Content Drop", desc: "Image → platform drafts", href: "/admin/marketing/content-drop", icon: Sparkles },
    { label: "Media Library", desc: "Upload raw photos/videos", href: "/admin/marketing/images", icon: ImageIcon },
    { label: "AI Chat", desc: "Strategy + content ideas", href: "/admin/marketing/chat", icon: Bot },
    { label: "Approval Queue", desc: `Review ${data?.pipeline.pending_approval ?? 0} pending`, href: "/admin/marketing/approvals", icon: ShieldCheck },
    { label: "Social Posts", desc: "Schedule + publish", href: "/admin/marketing/social", icon: Share2 },
    { label: "X Validator", desc: "Check post algo score", href: "/admin/marketing/validator", icon: Zap },
  ];

  return (
    <div className="container-max py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link href="/admin/marketing" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to marketing">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <BarChart3 className="h-7 w-7 text-forest" /> Marketing Command Center
          </h1>
          <p className="text-sm text-mocha">Your entire marketing operation at a glance.</p>
        </div>
        <button onClick={load} className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Refresh">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Pipeline Overview */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold text-espresso">
          <TrendingUp className="h-5 w-5 text-forest" /> Content Pipeline
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {pipelineStages.map((stage) => (
            <Link
              key={stage.label}
              href={stage.href}
              className="group rounded-2xl border border-latte/20 bg-card p-4 transition hover:border-forest/30 hover:shadow-sm"
            >
              <stage.icon className={`mb-2 h-6 w-6 ${stage.color}`} />
              <div className="font-heading text-2xl font-bold text-espresso">{stage.value}</div>
              <div className="text-xs text-mocha group-hover:text-espresso">{stage.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Quick Actions + Platform Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Quick Actions</h2>
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl border border-latte/20 bg-card p-3 transition hover:border-forest/30"
                >
                  <action.icon className="h-5 w-5 text-forest" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-espresso">{action.label}</div>
                    <div className="text-xs text-mocha">{action.desc}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-mocha opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Status */}
          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Platform Connections</h2>
            <div className="rounded-2xl border border-latte/20 bg-card p-4">
              {(data?.platforms ?? []).map((p) => (
                <div key={p.key} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-espresso capitalize">{p.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.configured
                        ? "bg-forest/15 text-forest"
                        : "bg-clay/15 text-clay"
                    }`}
                  >
                    {p.configured ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {p.configured ? "Connected" : "Not set"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Run Marketing Loop */}
          <div className="rounded-2xl border border-forest/30 bg-forest/5 p-4">
            <h3 className="mb-1 flex items-center gap-2 font-heading text-sm font-semibold text-espresso">
              <Zap className="h-4 w-4 text-forest" /> Autonomous Loop
            </h3>
            <p className="mb-3 text-xs text-mocha">
              Triggers the AI marketing loop — picks active specials, generates platform-specific drafts, lands them in your approval queue.
            </p>
            <button
              onClick={runMarketingLoop}
              disabled={runningLoop}
              className="btn-primary w-full text-sm disabled:opacity-60"
            >
              {runningLoop ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 inline h-4 w-4" />}
              Run Marketing Loop Now
            </button>
          </div>
        </div>

        {/* Middle: Recent Published */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Recently Published</h2>
            <div className="space-y-2">
              {(data?.recentPublished ?? []).length === 0 ? (
                <div className="rounded-2xl border border-latte/20 bg-card p-6 text-center text-sm text-mocha">
                  No posts published yet.
                </div>
              ) : (
                (data?.recentPublished ?? []).map((post) => (
                  <div key={post.id} className="rounded-xl border border-latte/20 bg-card p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-espresso/10 px-2 py-0.5 text-xs font-semibold capitalize text-espresso">
                        {post.platform}
                      </span>
                      <span className="text-xs text-mocha">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-espresso">{post.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trending Research placeholder */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold text-espresso">
              <Lightbulb className="h-5 w-5 text-clay" /> Trending Research
            </h2>
            <div className="rounded-2xl border border-clay/20 bg-clay/5 p-4">
              <p className="text-sm text-mocha">
                The Hermes trending-research cron runs Mon/Wed/Fri at 9am, scanning coffee and food industry
                trends for content ideas. Results are delivered via Hermes.
              </p>
              <p className="mt-2 text-xs text-mocha">
                <Link href="/admin/marketing/chat" className="text-forest underline">
                  Ask the AI Chat
                </Link>{" "}
                for current trend ideas anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Growth Insights */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold text-espresso">
            <TrendingUp className="h-5 w-5 text-forest" /> Growth Insights
          </h2>
          <div className="rounded-2xl border border-latte/20 bg-card p-4">
            <p className="mb-3 text-sm text-mocha">
              AI-generated recommendations based on your business signals — revenue trends, customer growth,
              marketing hygiene, and inventory.
            </p>
            <Link
              href="/admin/insights"
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest/10 px-3 py-2 text-sm font-medium text-forest transition hover:bg-forest/20"
            >
              <BarChart3 className="h-4 w-4" /> View Full Insights Dashboard
            </Link>
            <div className="mt-3 space-y-2 border-t border-latte/20 pt-3">
              {pipelineStages.find((s) => s.label === "Needs Approval")?.value! > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-clay/5 p-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                  <div className="text-xs">
                    <span className="font-medium text-espresso">Action needed:</span>{" "}
                    <span className="text-mocha">
                      {pipelineStages.find((s) => s.label === "Needs Approval")?.value} post(s) awaiting approval.
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-lg bg-forest/5 p-2">
                <Send className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                <div className="text-xs">
                  <span className="font-medium text-espresso">Tip:</span>{" "}
                  <span className="text-mocha">Post 2-3x daily on X for steady algorithm reach.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

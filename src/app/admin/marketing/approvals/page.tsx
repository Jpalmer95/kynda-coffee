"use client";

// /admin/marketing/approvals — Owner approval queue for agent-drafted posts.
// Agent/content-drop/special-sourced posts land here as pending_approval and
// cannot reach a publishable state without the owner approving them.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Bot,
  Hand,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Copy,
} from "lucide-react";

type Status =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";

interface Post {
  id: string;
  platform: string;
  text: string;
  image_urls?: string[];
  scheduled_at?: string | null;
  status: Status;
  source?: string;
  rejection_reason?: string | null;
  created_at: string;
}

const FILTERS: { key: string; label: string }[] = [
  { key: "pending_approval", label: "Needs approval" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" },
  { key: "rejected", label: "Rejected" },
  { key: "published", label: "Published" },
  { key: "all", label: "All" },
];

function SourceBadge({ source }: { source?: string }) {
  const map: Record<string, { icon: typeof Bot; label: string; cls: string }> = {
    agent: { icon: Bot, label: "AI agent", cls: "bg-forest/15 text-forest" },
    content_drop: { icon: ImageIcon, label: "Content drop", cls: "bg-clay/15 text-clay" },
    special: { icon: Sparkles, label: "Special", cls: "bg-sage/20 text-sage" },
    newsletter: { icon: Calendar, label: "Newsletter", cls: "bg-latte/20 text-mocha" },
    manual: { icon: Hand, label: "Manual", cls: "bg-latte/20 text-mocha" },
  };
  const m = map[source ?? "manual"] ?? map.manual;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

export default function ApprovalsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("pending_approval");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing/approvals?status=${filter}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPosts(data.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(postId: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
    }
    setBusy(postId);
    try {
      const res = await fetch("/api/admin/marketing/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  function copyPostText(text: string, platform: string) {
    navigator.clipboard.writeText(text);
    // Brief visual feedback via busy state
    setBusy(`copy-${platform}-${text.slice(0, 10)}`);
    setTimeout(() => setBusy(null), 1000);
  }

  const pendingCount = posts.filter((p) => p.status === "pending_approval").length;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/marketing" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to marketing">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <ShieldCheck className="h-7 w-7 text-forest" /> Approval Queue
          </h1>
          <p className="text-sm text-mocha">
            Agents draft, you ship. Nothing posts publicly without your approval.
            {filter === "pending_approval" && pendingCount > 0 ? ` ${pendingCount} waiting.` : ""}
          </p>
        </div>
        <button onClick={load} className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Refresh">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === f.key ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
          {filter === "pending_approval" ? "Nothing waiting for approval. 🎉" : "No posts in this view."}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const isPending = p.status === "pending_approval";
            return (
              <div key={p.id} className="rounded-2xl border border-latte/20 bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-espresso/10 px-2 py-0.5 text-xs font-semibold capitalize text-espresso">
                    {p.platform}
                  </span>
                  <SourceBadge source={p.source} />
                  <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs capitalize text-mocha">
                    {p.status.replace("_", " ")}
                  </span>
                  {p.scheduled_at && (
                    <span className="inline-flex items-center gap-1 text-xs text-mocha">
                      <Calendar className="h-3 w-3" /> {new Date(p.scheduled_at).toLocaleString()}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-mocha">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>

                <p className="whitespace-pre-wrap text-sm text-espresso">{p.text}</p>

                {p.image_urls && p.image_urls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.image_urls.map((url, i) => (
                      <img key={i} src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    ))}
                  </div>
                )}

                {p.rejection_reason && (
                  <p className="mt-2 text-xs text-red-600">Rejected: {p.rejection_reason}</p>
                )}

                {isPending && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => act(p.id, "approve")}
                      disabled={busy === p.id}
                      className="btn-primary text-sm disabled:opacity-60"
                    >
                      {busy === p.id ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 inline h-4 w-4" />}
                      Approve{p.scheduled_at ? " & schedule" : ""}
                    </button>
                    <button
                      onClick={() => act(p.id, "reject")}
                      disabled={busy === p.id}
                      className="btn-secondary text-sm text-red-600 disabled:opacity-60"
                    >
                      <XCircle className="mr-1.5 inline h-4 w-4" /> Reject
                    </button>
                    <button
                      onClick={() => copyPostText(p.text, p.platform)}
                      className="btn-secondary text-sm disabled:opacity-60"
                      title="Copy caption for manual posting"
                    >
                      <Copy className="mr-1.5 inline h-4 w-4" /> Copy Text
                    </button>
                  </div>
                )}

                {!isPending && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => copyPostText(p.text, p.platform)}
                      className="btn-secondary text-sm"
                      title="Copy caption for manual posting"
                    >
                      <Copy className="mr-1.5 inline h-4 w-4" /> Copy Text
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

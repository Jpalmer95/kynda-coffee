"use client";

// /admin/marketing/social — Social Media Post Management
// Create, schedule, publish, and monitor social media posts across platforms

import { useEffect, useState } from "react";
import {
  Share2,
  Send,
  Plus,
  Calendar,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type Platform = "instagram" | "twitter" | "facebook" | "tiktok";
type PostStatus = "draft" | "scheduled" | "published" | "failed";

interface PlatformInfo {
  key: Platform;
  name: string;
  configured: boolean;
}

interface SocialPost {
  id: string;
  platform: Platform;
  text: string;
  image_urls: string[];
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  status: PostStatus;
  error_message: string | null;
  created_at: string;
}

// ─── Platform colors and icons ───────────────────────────────────────────────
const PLATFORM_STYLES: Record<Platform, { bg: string; text: string; label: string }> = {
  instagram: { bg: "bg-pink-100", text: "text-pink-700", label: "IG" },
  twitter: { bg: "bg-sky-100", text: "text-sky-700", label: "X" },
  facebook: { bg: "bg-blue-100", text: "text-blue-700", label: "FB" },
  tiktok: { bg: "bg-gray-800", text: "text-gray-100", label: "TT" },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketingSocialPage() {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formPlatform, setFormPlatform] = useState<Platform>("instagram");
  const [formText, setFormText] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formPublishNow, setFormPublishNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Load data ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);

    fetch(`/api/marketing/social/posts?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setPlatforms(data.platforms || []);
        setPosts(data.posts || []);
        setTotal(data.total || 0);
        if (data.degraded) {
          // Soft-degraded (e.g. table missing) — don't show an error toast,
          // just let the UI render empty state silently.
          console.debug("[social] posts endpoint degraded:", data.error_hint);
        }
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : "Load failed", "error");
      })
      .finally(() => setLoading(false));
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/marketing/social/posts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPlatforms(data.platforms || []);
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Load failed", "error");
    } finally {
      setLoading(false);
    }
  }

  // ─── Submit new post ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formText.trim()) {
      toast("Post text is required", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (formPublishNow) {
        // Create as draft, then publish immediately
        const createRes = await fetch("/api/marketing/social/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            text: formText,
            image_urls: formImageUrl ? [formImageUrl] : [],
            status: "draft",
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error);

        const pubRes = await fetch("/api/marketing/social/publish-now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: createData.id }),
        });
        const pubData = await pubRes.json();

        if (pubData.success) {
          toast(`Published to ${formPlatform}`, "success");
        } else {
          toast(`Publish failed: ${pubData.error}`, "error");
        }
      } else {
        // Schedule or save as draft
        const res = await fetch("/api/marketing/social/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            text: formText,
            image_urls: formImageUrl ? [formImageUrl] : [],
            scheduled_at: formScheduledAt || undefined,
            status: formScheduledAt ? "scheduled" : "draft",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        toast(
          formScheduledAt ? "Post scheduled" : "Draft saved",
          "success"
        );
      }

      // Reset form
      setFormText("");
      setFormImageUrl("");
      setFormScheduledAt("");
      setFormPublishNow(false);
      setShowForm(false);
      refreshData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Submit failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Publish a draft/scheduled post ───────────────────────────────────
  async function handlePublish(post: SocialPost) {
    try {
      const res = await fetch("/api/marketing/social/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await res.json();

      if (data.success) {
        toast(`Published to ${post.platform}`, "success");
      } else {
        toast(`Failed: ${data.error}`, "error");
      }
      refreshData();
    } catch (err) {
      toast("Publish failed", "error");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Share2 className="h-7 w-7 text-forest" />
            Social Media Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, schedule, and publish posts across Instagram, X, and Facebook.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? (
            <>
              <XCircle className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> New Post
            </>
          )}
        </button>
      </div>

      {/* Platform status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {platforms.map((p) => (
          <div
            key={p.key}
            className={cn(
              "rounded-xl border p-3",
              p.configured
                ? "border-green-200 bg-green-50"
                : "border-border/40 bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold",
                  PLATFORM_STYLES[p.key].bg,
                  PLATFORM_STYLES[p.key].text
                )}
              >
                {PLATFORM_STYLES[p.key].label}
              </span>
              <span className="text-sm font-medium text-foreground">{p.name}</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {p.configured ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700">Connected</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Not configured</span>
                </>
              )}
            </div>
          </div>
        ))}
        {platforms.length === 0 && !loading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-muted/30 p-3 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          ))
        )}
      </div>

      {/* Create post form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border/40 bg-card p-5 space-y-4"
        >
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Create New Post
          </h2>

          {/* Platform selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
            <div className="flex gap-2">
              {(["instagram", "twitter", "facebook"] as Platform[]).map((p) => {
                const info = platforms.find((x) => x.key === p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPlatform(p)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      formPlatform === p
                        ? "border-forest bg-forest/10 text-forest"
                        : "border-border/40 bg-card text-muted-foreground hover:bg-muted/30",
                      !info?.configured && "opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold",
                        PLATFORM_STYLES[p].bg,
                        PLATFORM_STYLES[p].text
                      )}
                    >
                      {PLATFORM_STYLES[p].label}
                    </span>
                    {info?.name || p}
                    {!info?.configured && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post text */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Post Text
            </label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              rows={4}
              maxLength={formPlatform === "twitter" ? 280 : 2200}
              placeholder={
                formPlatform === "twitter"
                  ? "Write your tweet… (280 char max)"
                  : "Write your post…"
              }
              className="input-field w-full resize-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formText.length}/{formPlatform === "twitter" ? 280 : 2200}
            </p>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Image URL (optional)
            </label>
            <div className="flex gap-2">
              <input
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                type="url"
                placeholder="https://..."
                className="input-field flex-1"
              />
              {formImageUrl && (
                <img
                  src={formImageUrl}
                  alt="Preview"
                  className="h-10 w-10 rounded object-cover border border-border/40"
                />
              )}
            </div>
          </div>

          {/* Schedule or publish now */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Schedule Date/Time (optional)
              </label>
              <input
                type="datetime-local"
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="input-field w-full"
                disabled={formPublishNow}
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="publishNow"
                checked={formPublishNow}
                onChange={(e) => {
                  setFormPublishNow(e.target.checked);
                  if (e.target.checked) setFormScheduledAt("");
                }}
                className="h-4 w-4 accent-forest"
              />
              <label htmlFor="publishNow" className="text-sm text-foreground">
                Publish Now
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : formPublishNow ? (
              <>
                <Send className="h-4 w-4" /> Publish Now
              </>
            ) : formScheduledAt ? (
              <>
                <Calendar className="h-4 w-4" /> Schedule Post
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Save Draft
              </>
            )}
          </button>
        </form>
      )}

      {/* Posts list */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 overflow-x-auto">
          {(["all", "draft", "scheduled", "published", "failed"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  filter === s
                    ? "bg-forest text-sand"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== "all" && ` (${total})`}
              </button>
            )
          )}
          <button
            onClick={refreshData}
            disabled={loading}
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:bg-muted/30"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
          </button>
        </div>

        {/* Posts */}
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-forest animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Share2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>
              {filter === "all"
                ? "No posts yet. Create your first post above."
                : `No ${filter} posts.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {posts.map((post) => (
              <div key={post.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5",
                        PLATFORM_STYLES[post.platform]?.bg,
                        PLATFORM_STYLES[post.platform]?.text
                      )}
                    >
                      {PLATFORM_STYLES[post.platform]?.label || post.platform.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-3">
                        {post.text}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <StatusBadge status={post.status} />
                        {post.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.scheduled_at).toLocaleString()}
                          </span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {new Date(post.published_at).toLocaleString()}
                          </span>
                        )}
                        {post.image_urls.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {post.image_urls.length} image
                            {post.image_urls.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {post.error_message && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {post.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {(post.status === "draft" || post.status === "failed") && (
                    <button
                      onClick={() => handlePublish(post)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-forest/10 text-forest hover:bg-forest/20 transition-colors flex-shrink-0"
                    >
                      <Send className="h-3 w-3" />
                      Publish
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PostStatus }) {
  const styles: Record<PostStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
    draft: { bg: "bg-muted/50", text: "text-muted-foreground", icon: Clock },
    scheduled: { bg: "bg-amber-50", text: "text-amber-700", icon: Calendar },
    published: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle },
    failed: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
  };

  const style = styles[status];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
        style.bg,
        style.text
      )}
    >
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

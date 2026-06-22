"use client";

// /admin/marketing/content-drop — Drop a product/feature image, get platform-
// specific draft posts in the approval queue. Owner reviews + approves elsewhere.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, Send, ShieldCheck, ImageIcon } from "lucide-react";

const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "tiktok", label: "TikTok" },
  { key: "bluesky", label: "Bluesky" },
] as const;

export default function ContentDropPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selected, setSelected] = useState<string[]>(PLATFORMS.map((p) => p.key));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: { platform: string }[]; skipped: { platform: string; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function submit() {
    setError(null);
    setResult(null);
    if (!imageUrl.trim()) {
      setError("Paste an image URL (use the Image Library to upload, then copy its URL).");
      return;
    }
    if (selected.length === 0) {
      setError("Pick at least one platform.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/marketing/content-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          platforms: selected,
          hashtags: hashtags
            .split(/[,\s]+/)
            .map((h) => h.replace(/^#/, "").trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate drafts");
      setResult({ created: data.created ?? [], skipped: data.skipped ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/marketing" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to marketing">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Sparkles className="h-7 w-7 text-forest" /> Content Drop
          </h1>
          <p className="text-sm text-mocha">
            Drop a feature image and we&apos;ll draft platform-specific posts straight into the approval queue.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-latte/20 bg-card p-6">
          <label className="block text-sm font-medium text-espresso">
            Image URL *
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="input-field mt-1" />
            <span className="mt-1 block text-xs text-mocha">
              Tip: upload in the{" "}
              <Link href="/admin/marketing/images" className="text-forest underline">
                Image Library
              </Link>{" "}
              then copy a URL here.
            </span>
          </label>
          <label className="block text-sm font-medium text-espresso">
            Featured item / title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lavender Honey Latte" className="input-field mt-1" />
          </label>
          <label className="block text-sm font-medium text-espresso">
            Notes / talking points
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="New seasonal, real Vermont maple, here through October." className="input-field mt-1 min-h-24" />
          </label>
          <label className="block text-sm font-medium text-espresso">
            Extra hashtags (optional)
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="fall, seasonal, latte" className="input-field mt-1" />
            <span className="mt-1 block text-xs text-mocha">Brand tags (#KyndaCoffee, #HorseshoeBayTX) are always added.</span>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-espresso">Platforms</span>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePlatform(p.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    selected.includes(p.key) ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={busy} className="btn-primary w-full text-sm disabled:opacity-60">
            {busy ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Send className="mr-1.5 inline h-4 w-4" />}
            Generate drafts → approval queue
          </button>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="space-y-4">
          {imageUrl.trim() ? (
            <img src={imageUrl} alt="Preview" className="aspect-square w-full rounded-2xl border border-latte/20 object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-latte/30 bg-card text-mocha">
              <ImageIcon className="h-10 w-10 opacity-40" />
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-sage/30 bg-sage/5 p-4">
              <div className="flex items-center gap-2 font-heading text-lg font-semibold text-espresso">
                <ShieldCheck className="h-5 w-5 text-forest" /> Drafted to approval queue
              </div>
              <p className="mt-1 text-sm text-mocha">
                {result.created.length} draft(s) created. Review and approve them in the{" "}
                <Link href="/admin/marketing/approvals" className="text-forest underline">
                  Approval Queue
                </Link>
                .
              </p>
              {result.created.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-espresso">
                  {result.created.map((c, i) => (
                    <li key={i} className="capitalize">{c.platform}</li>
                  ))}
                </ul>
              )}
              {result.skipped.length > 0 && (
                <div className="mt-3 text-sm text-clay">
                  Skipped: {result.skipped.map((s) => `${s.platform} (${s.reason})`).join("; ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

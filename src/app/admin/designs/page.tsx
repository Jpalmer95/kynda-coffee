"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
  Heart,
  Store,
  Loader2,
  Plus,
} from "lucide-react";

interface StudioDesign {
  id: string;
  name: string;
  description: string;
  image_url: string;
  style: string;
  product_id: string | null;
  trending: boolean;
  seasonal: boolean;
  is_active: boolean;
  show_on_shop: boolean;
  sort_order: number;
  prompt: string | null;
  created_at: string;
}

const STYLES = ["logo", "nature", "minimal", "vintage", "typography", "abstract", "seasonal"];

export default function AdminStudioDesignsPage() {
  const [designs, setDesigns] = useState<StudioDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<"upload" | "generate">("upload");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Create form state
  const [name, setName] = useState("");
  const [style, setStyle] = useState("logo");
  const [trending, setTrending] = useState(false);
  const [showOnShop, setShowOnShop] = useState(true);
  const [imageData, setImageData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/studio-designs");
      const data = await res.json();
      setDesigns(data.designs ?? []);
    } catch {
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (mode === "upload" && !imageData) {
      setError("Choose an image to upload");
      return;
    }
    if (mode === "generate" && !prompt.trim()) {
      setError("Enter a generation prompt");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/studio-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          style,
          trending,
          show_on_shop: showOnShop,
          ...(mode === "upload"
            ? { image_data: imageData }
            : { generate: true, prompt: prompt.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Create failed");
        return;
      }
      // Reset + refresh
      setName("");
      setImageData(null);
      setPrompt("");
      setTrending(false);
      setShowCreate(false);
      fetchDesigns();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function patchDesign(id: string, fields: Partial<StudioDesign>) {
    // Optimistic update
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)));
    await fetch("/api/admin/studio-designs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    }).catch(() => fetchDesigns());
  }

  async function deleteDesign(id: string) {
    if (!confirm("Delete this design? Customers will no longer see it.")) return;
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/admin/studio-designs?id=${id}`, { method: "DELETE" }).catch(() =>
      fetchDesigns()
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
                Studio Designs
              </h1>
              <p className="text-sm text-mocha">
                Curate trending & recommended designs for the Design Studio and Shop
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest/90 transition"
          >
            <Plus size={16} /> New Design
          </button>
        </div>

        {/* Create panel */}
        {showCreate && (
          <div className="mb-8 rounded-xl border border-latte/20 bg-card p-6 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("upload")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "upload" ? "bg-forest text-white" : "bg-background text-mocha border border-latte/30"
                }`}
              >
                <Upload size={14} /> Upload Image
              </button>
              <button
                onClick={() => setMode("generate")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "generate" ? "bg-forest text-white" : "bg-background text-mocha border border-latte/30"
                }`}
              >
                <Sparkles size={14} /> Generate with AI
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-mocha mb-1 uppercase tracking-wider">
                  Design Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="Hill Country Sunset"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mocha mb-1 uppercase tracking-wider">
                  Style
                </label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="form-input">
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mode === "upload" ? (
              <div>
                <label className="block text-xs font-medium text-mocha mb-1 uppercase tracking-wider">
                  Image (PNG with transparency works best) *
                </label>
                <input type="file" accept="image/*" onChange={handleFile} className="text-sm" />
                {imageData && (
                  <img
                    src={imageData}
                    alt="Preview"
                    className="mt-3 h-32 w-32 rounded-lg object-contain bg-white border border-latte/20"
                  />
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-mocha mb-1 uppercase tracking-wider">
                  Generation Prompt *
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="form-input min-h-[80px]"
                  placeholder="A vintage-style Texas longhorn skull made of coffee beans, warm rust tones, clean white background, merch print design"
                />
                <p className="mt-1 text-xs text-mocha/70">
                  Tip: end with "centered on plain white background, merch print design" for clean results.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} />
                <Heart size={14} className="text-red-500" /> Trending
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showOnShop} onChange={(e) => setShowOnShop(e.target.checked)} />
                <Store size={14} /> Show on Shop page
              </label>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
            )}

            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-white hover:bg-forest/90 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === "generate" ? "Generating (can take ~30s)..." : "Saving..."}
                </>
              ) : (
                <>{mode === "generate" ? "Generate & Save" : "Save Design"}</>
              )}
            </button>
          </div>
        )}

        {/* Designs grid */}
        {loading ? (
          <div className="py-16 text-center text-mocha">Loading designs...</div>
        ) : designs.length === 0 ? (
          <div className="py-16 text-center text-mocha">
            No curated designs yet. Click "New Design" to upload or generate your first one.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map((d) => (
              <div
                key={d.id}
                className={`rounded-xl border bg-card overflow-hidden transition ${
                  d.is_active ? "border-latte/20" : "border-latte/10 opacity-60"
                }`}
              >
                <div className="aspect-square bg-white">
                  <img src={d.image_url} alt={d.name} className="h-full w-full object-contain" />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-espresso">{d.name}</div>
                      <div className="text-xs text-mocha capitalize">{d.style}</div>
                    </div>
                    <button
                      onClick={() => deleteDesign(d.id)}
                      className="shrink-0 rounded p-1 text-mocha hover:text-destructive transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => patchDesign(d.id, { is_active: !d.is_active })}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                        d.is_active ? "bg-forest/10 text-forest" : "bg-latte/20 text-mocha"
                      }`}
                      title={d.is_active ? "Visible to customers" : "Hidden"}
                    >
                      {d.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                      {d.is_active ? "Live" : "Hidden"}
                    </button>
                    <button
                      onClick={() => patchDesign(d.id, { trending: !d.trending })}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                        d.trending ? "bg-red-500/10 text-red-600" : "bg-latte/20 text-mocha"
                      }`}
                    >
                      <Heart size={11} /> Trending
                    </button>
                    <button
                      onClick={() => patchDesign(d.id, { show_on_shop: !d.show_on_shop })}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                        d.show_on_shop ? "bg-forest/10 text-forest" : "bg-latte/20 text-mocha"
                      }`}
                    >
                      <Store size={11} /> Shop
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

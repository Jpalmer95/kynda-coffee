"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, Save, Trash2, Sparkles, Eye, EyeOff } from "lucide-react";
import { isSpecialLive, type Special } from "@/lib/marketing/specials";

type EditState = Partial<Special> & { title: string };

const EMPTY: EditState = {
  title: "",
  subtitle: "",
  description: "",
  provider_item_id: "",
  image_url: "",
  price_cents: null,
  compare_at_cents: null,
  badge: "",
  cta_label: "Order now",
  starts_at: null,
  ends_at: null,
  is_active: true,
  sort_order: 0,
};

function dollarsToCents(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function centsToDollars(c: number | null | undefined): string {
  return c == null ? "" : (c / 100).toFixed(2);
}

export default function AdminSpecialsPage() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/specials", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load specials");
      setSpecials(data.specials ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.title?.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/specials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Save failed");
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Special) {
    await fetch("/api/admin/specials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, is_active: !s.is_active }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this special?")) return;
    await fetch(`/api/admin/specials?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to admin">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Sparkles className="h-7 w-7 text-forest" /> Monthly Specials
          </h1>
          <p className="text-sm text-mocha">Drives the Specials section at the top of the Menu — and seeds marketing campaigns.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary text-sm">
          <Plus className="mr-1.5 inline h-4 w-4" /> New Special
        </button>
      </div>

      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Editor */}
      {editing && (
        <div className="mb-8 rounded-2xl border border-forest/30 bg-card p-6">
          <h2 className="mb-4 font-heading text-xl font-bold text-espresso">{editing.id ? "Edit" : "New"} Special</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-espresso">
              Title *
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Subtitle
              <input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso sm:col-span-2">
              Description
              <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="input-field mt-1 min-h-20" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Image URL
              <input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="input-field mt-1" placeholder="https://" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Linked POS item ID (for Add to Cart)
              <input value={editing.provider_item_id ?? ""} onChange={(e) => setEditing({ ...editing, provider_item_id: e.target.value })} className="input-field mt-1" placeholder="Square item id" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Price ($)
              <input type="number" step="0.01" value={centsToDollars(editing.price_cents)} onChange={(e) => setEditing({ ...editing, price_cents: dollarsToCents(e.target.value) })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Compare-at / was ($)
              <input type="number" step="0.01" value={centsToDollars(editing.compare_at_cents)} onChange={(e) => setEditing({ ...editing, compare_at_cents: dollarsToCents(e.target.value) })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Badge
              <input value={editing.badge ?? ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} className="input-field mt-1" placeholder="New / Seasonal / Limited" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              CTA label
              <input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Starts (optional)
              <input type="datetime-local" value={editing.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Ends (optional)
              <input type="datetime-local" value={editing.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Sort order
              <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="input-field mt-1" />
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
              {saving ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Save className="mr-1.5 inline h-4 w-4" />} Save
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
      ) : specials.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">No specials yet. Create one to feature it at the top of the Menu.</div>
      ) : (
        <div className="space-y-3">
          {specials.map((s) => {
            const live = isSpecialLive(s);
            return (
              <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-latte/20 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-espresso">{s.title}</h3>
                    {s.badge && <span className="rounded-full bg-forest/15 px-2 py-0.5 text-xs text-forest">{s.badge}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${live ? "bg-sage/20 text-sage" : "bg-latte/20 text-mocha"}`}>
                      {live ? "Live now" : s.is_active ? "Scheduled/inactive window" : "Off"}
                    </span>
                  </div>
                  {s.subtitle && <p className="text-sm text-forest">{s.subtitle}</p>}
                  <p className="mt-0.5 text-xs text-mocha">
                    {s.price_cents != null ? `$${(s.price_cents / 100).toFixed(2)}` : "No price"} · sort {s.sort_order}
                    {s.starts_at ? ` · from ${new Date(s.starts_at).toLocaleDateString()}` : ""}
                    {s.ends_at ? ` · until ${new Date(s.ends_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <button onClick={() => toggleActive(s)} className="rounded-lg p-2 text-mocha hover:bg-latte/10" title={s.is_active ? "Deactivate" : "Activate"}>
                  {s.is_active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
                <button onClick={() => setEditing({ ...s })} className="btn-secondary text-sm">Edit</button>
                <button onClick={() => remove(s.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Delete">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

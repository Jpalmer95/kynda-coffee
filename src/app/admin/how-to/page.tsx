"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Pencil, Plus, Save, Trash2, Wrench, X,
} from "lucide-react";

interface Guide {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

const CATEGORIES = ["equipment", "cold-brew", "cleaning", "maintenance", "safety", "opening", "closing", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  equipment: "Equipment", "cold-brew": "Cold Brew", cleaning: "Cleaning",
  maintenance: "Maintenance", safety: "Safety", opening: "Opening", closing: "Closing", other: "Other",
};

export default function AdminHowToPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", category: "equipment", content: "", image_url: "", video_url: "", sort_order: 0, is_active: true });

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/how-to", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setGuides(data.guides ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", description: "", category: "equipment", content: "", image_url: "", video_url: "", sort_order: 0, is_active: true });
    setShowForm(true);
  }

  function openEdit(g: Guide) {
    setEditing(g);
    setForm({ title: g.title, description: g.description ?? "", category: g.category, content: g.content, image_url: g.image_url ?? "", video_url: g.video_url ?? "", sort_order: g.sort_order, is_active: g.is_active });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        category: form.category,
        content: form.content,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      const res = await fetch("/api/admin/how-to", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this guide?")) return;
    try {
      await fetch(`/api/admin/how-to?id=${id}`, { method: "DELETE" });
      await load();
    } catch {
      // best-effort
    }
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Wrench className="h-7 w-7 text-forest" /> How-To Guides
          </h1>
          <p className="text-sm text-mocha">{guides.length} guides · staff sees active ones</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus className="mr-2 h-4 w-4" /> New Guide
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : guides.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">No guides yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <div key={g.id} className={`rounded-2xl border bg-card p-4 ${g.is_active ? "border-latte/20" : "border-latte/20 opacity-60"}`}>
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg font-bold text-espresso">{g.title}</h3>
                  <span className="mt-1 inline-block rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">
                    {CATEGORY_LABELS[g.category] ?? g.category}
                  </span>
                  {!g.is_active && <span className="ml-2 text-xs text-red-600">Inactive</span>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(g)} className="rounded-lg p-1.5 text-mocha hover:bg-latte/20"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(g.id)} className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {g.description && <p className="mb-1 text-sm text-mocha line-clamp-2">{g.description}</p>}
              <p className="text-xs text-mocha/70">{g.content ? `${g.content.length} chars` : "No content"} · Updated {new Date(g.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-espresso">{editing ? "Edit Guide" : "New How-To Guide"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1 text-mocha hover:bg-latte/20"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-espresso">
                Title *
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field mt-1" placeholder="e.g., Espresso Machine Cleaning" />
              </label>
              <label className="block text-sm font-medium text-espresso">
                Description
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field mt-1" placeholder="Short summary" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-espresso">
                  Category
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="select-field mt-1">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Sort order
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="input-field mt-1" />
                </label>
              </div>
              <label className="block text-sm font-medium text-espresso">
                Content (Markdown)
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field mt-1 min-h-48 font-mono text-sm" placeholder="# Title&#10;&#10;## Step 1&#10;..." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-espresso">
                  Image URL
                  <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input-field mt-1" placeholder="https://..." />
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Video URL
                  <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} className="input-field mt-1" placeholder="https://..." />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-espresso">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-latte/40" />
                Active (visible to staff)
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editing ? "Save Changes" : "Create Guide"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

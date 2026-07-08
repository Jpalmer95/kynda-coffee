"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

type Module = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  order_index: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  "onboarding", "opening", "closing", "drinks", "food",
  "equipment", "safety", "customer_service", "maintenance",
];

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  opening: "Opening",
  closing: "Closing",
  drinks: "Drinks",
  food: "Food",
  equipment: "Equipment",
  safety: "Safety",
  customer_service: "Customer Service",
  maintenance: "Maintenance",
};

export default function AdminTrainingPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Module | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("onboarding");
  const [formContent, setFormContent] = useState("");
  const [formRequired, setFormRequired] = useState(false);
  const [formOrder, setFormOrder] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/training/modules", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load modules");
      setModules(data.modules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormTitle(""); setFormDesc(""); setFormCategory("onboarding");
    setFormContent(""); setFormRequired(false); setFormOrder(0);
    setShowForm(true);
  }

  function openEdit(module: Module) {
    setEditing(module);
    setFormTitle(module.title);
    setFormDesc(module.description ?? "");
    setFormCategory(module.category);
    setFormContent(module.content);
    setFormRequired(module.is_required);
    setFormOrder(module.order_index);
    setShowForm(true);
  }

  async function saveModule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: formTitle,
        description: formDesc || null,
        category: formCategory,
        content: formContent,
        is_required: formRequired,
        order_index: formOrder,
      };

      const res = await fetch("/api/admin/training/modules", {
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

  async function deleteModule(id: string) {
    if (!confirm("Delete this training module?")) return;
    try {
      const res = await fetch(`/api/admin/training/modules?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const filteredModules = filter === "all"
    ? modules
    : modules.filter((m) => m.category === filter);

  const requiredCount = modules.filter((m) => m.is_required).length;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <GraduationCap className="h-7 w-7 text-forest" /> Training
          </h1>
          <p className="text-sm text-mocha">
            {modules.length} modules • {requiredCount} required
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus className="mr-2 h-4 w-4" /> New Module
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-bronze/30 bg-bronze/10 p-3 text-sm text-espresso">{error}</div>}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === "all" ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === cat ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Module list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading modules...
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-mocha/40" />
          <p className="mt-4 text-mocha">No training modules yet.</p>
          <p className="mt-1 text-sm text-mocha/70">Create your first module to start training your team.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((module) => (
            <div key={module.id} className="rounded-2xl border border-latte/20 bg-card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg font-bold text-espresso">{module.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">
                      {CATEGORY_LABELS[module.category] ?? module.category}
                    </span>
                    {module.is_required && (
                      <span className="rounded-full bg-bronze/15 px-2 py-0.5 text-xs text-espresso">Required</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(module)} className="rounded-lg p-1.5 text-mocha hover:bg-latte/20" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteModule(module.id)} className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {module.description && <p className="mb-2 text-sm text-mocha line-clamp-2">{module.description}</p>}
              <p className="text-xs text-mocha/70">
                {module.content ? `${module.content.length} chars of content` : "No content yet"} •
                Updated {new Date(module.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <form onSubmit={saveModule} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-espresso">
                {editing ? "Edit Module" : "New Training Module"}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1 text-mocha hover:bg-latte/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-espresso">
                Title *
                <input required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input-field mt-1" placeholder="e.g., Espresso Machine Basics" />
              </label>

              <label className="block text-sm font-medium text-espresso">
                Description
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="input-field mt-1" placeholder="Short summary of what this module covers" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-espresso">
                  Category
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="select-field mt-1">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
                  </select>
                </label>

                <label className="block text-sm font-medium text-espresso">
                  Sort order
                  <input type="number" value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} className="input-field mt-1" />
                </label>
              </div>

              <label className="block text-sm font-medium text-espresso">
                Content (Markdown)
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="input-field mt-1 min-h-48 font-mono text-sm"
                  placeholder="# Espresso Machine Basics&#10;&#10;## Overview&#10;This module covers...&#10;&#10;## Steps&#10;1. Turn on machine&#10;2. Wait for warm-up..."
                />
                <span className="mt-1 block text-xs text-mocha">Supports markdown: # headings, **bold**, - lists, etc.</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-espresso">
                <input type="checkbox" checked={formRequired} onChange={(e) => setFormRequired(e.target.checked)} className="h-4 w-4 rounded border-latte/40" />
                Required for all staff
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editing ? "Save Changes" : "Create Module"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

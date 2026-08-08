"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Coffee, Loader2, Pencil, Plus, Save, Trash2, X,
} from "lucide-react";

interface Recipe {
  id: string;
  name: string;
  category: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: { order: number; instruction: string }[];
  prep_time_minutes: number;
  servings: number;
  notes: string | null;
  image_url: string | null;
}

const CATEGORIES = ["espresso", "cold-brew", "tea", "smoothie", "food", "pastry", "seasonal"];
const CATEGORY_LABELS: Record<string, string> = {
  espresso: "Espresso", "cold-brew": "Cold Brew", tea: "Tea", smoothie: "Smoothie",
  food: "Food", pastry: "Pastry", seasonal: "Seasonal",
};

const emptyRecipe = (): Recipe => ({
  id: "", name: "", category: "food", ingredients: [{ name: "", amount: "", unit: "" }],
  steps: [{ order: 1, instruction: "" }], prep_time_minutes: 5, servings: 1, notes: null, image_url: null,
});

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState<Recipe>(emptyRecipe());

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/recipes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRecipes(data.recipes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyRecipe());
    setShowForm(true);
  }

  function openEdit(r: Recipe) {
    setEditing(r);
    setForm({
      ...r,
      ingredients: r.ingredients?.length ? r.ingredients : [{ name: "", amount: "", unit: "" }],
      steps: r.steps?.length ? r.steps : [{ order: 1, instruction: "" }],
    });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        ingredients: form.ingredients.filter((i) => i.name.trim()),
        steps: form.steps.filter((s) => s.instruction.trim()).map((s, i) => ({ ...s, order: i + 1 })),
        prep_time_minutes: form.prep_time_minutes,
        servings: form.servings,
        notes: form.notes || null,
        image_url: form.image_url || null,
      };
      const res = await fetch("/api/admin/recipes", {
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
    if (!confirm("Delete this recipe?")) return;
    try {
      await fetch(`/api/admin/recipes?id=${id}`, { method: "DELETE" });
      await load();
    } catch { /* best-effort */ }
  }

  const filtered = filter === "all" ? recipes : recipes.filter((r) => r.category === filter);

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Coffee className="h-7 w-7 text-forest" /> Recipes
          </h1>
          <p className="text-sm text-mocha">{recipes.length} recipes · staff sees all active</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus className="mr-2 h-4 w-4" /> New Recipe
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === "all" ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === c ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">No recipes found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl border border-latte/20 bg-card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg font-bold text-espresso">{r.name}</h3>
                  <span className="mt-1 inline-block rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">{CATEGORY_LABELS[r.category] ?? r.category}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-mocha hover:bg-latte/20"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(r.id)} className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-mocha/70">
                {r.prep_time_minutes} min · {r.servings} serving(s) · {r.ingredients?.length ?? 0} ingredients · {r.steps?.length ?? 0} steps
              </p>
              {r.notes && <p className="mt-1 text-xs text-mocha line-clamp-1">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-espresso">{editing ? "Edit Recipe" : "New Recipe"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1 text-mocha hover:bg-latte/20"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-espresso">
                  Name *
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field mt-1" placeholder="Classic Latte" />
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Category
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="select-field mt-1">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-espresso">
                  Prep time (min)
                  <input type="number" min="1" value={form.prep_time_minutes} onChange={(e) => setForm({ ...form, prep_time_minutes: Number(e.target.value) })} className="input-field mt-1" />
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Servings
                  <input type="number" min="1" value={form.servings} onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })} className="input-field mt-1" />
                </label>
              </div>

              {/* Ingredients */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-espresso">Ingredients</span>
                  <button type="button" onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { name: "", amount: "", unit: "" }] })} className="text-xs text-forest hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={ing.name} onChange={(e) => setForm({ ...form, ingredients: form.ingredients.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })} placeholder="Ingredient" className="flex-1 rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
                      <input value={ing.amount} onChange={(e) => setForm({ ...form, ingredients: form.ingredients.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x) })} placeholder="Amount" className="w-20 rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
                      <input value={ing.unit} onChange={(e) => setForm({ ...form, ingredients: form.ingredients.map((x, idx) => idx === i ? { ...x, unit: e.target.value } : x) })} placeholder="Unit" className="w-24 rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
                      <button type="button" onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) })} className="rounded-lg p-2 text-mocha hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-espresso">Steps</span>
                  <button type="button" onClick={() => setForm({ ...form, steps: [...form.steps, { order: form.steps.length + 1, instruction: "" }] })} className="text-xs text-forest hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-sm font-bold text-forest">{i + 1}</span>
                      <input value={step.instruction} onChange={(e) => setForm({ ...form, steps: form.steps.map((x, idx) => idx === i ? { ...x, instruction: e.target.value } : x) })} placeholder="Step instruction..." className="flex-1 rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
                      <button type="button" onClick={() => setForm({ ...form, steps: form.steps.filter((_, idx) => idx !== i) })} className="rounded-lg p-2 text-mocha hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-espresso">
                Notes
                <input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} className="input-field mt-1" placeholder="Optional notes" />
              </label>
              <label className="block text-sm font-medium text-espresso">
                Image URL
                <input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value || null })} className="input-field mt-1" placeholder="https://..." />
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editing ? "Save Changes" : "Create Recipe"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

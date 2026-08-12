"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Boxes, Loader2, Package, Pencil, Plus, Save, ShoppingCart, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IngredientItem {
  id: string;
  ingredient_name: string;
  area: string;
  unit: string;
  par_level: number;
  vendor: string;
  cadence: string;
  on_hand: number | null;
  order_qty: number | null;
  needs_order: boolean;
  notes: string | null;
}

interface PurchaseOrder {
  id: string;
  vendor: string;
  status: string;
  items: { name: string; qty: number; unit: string; par: number; on_hand: number }[];
  notes: string | null;
  created_at: string;
  approved_at: string | null;
}

const VENDORS = ["HEB", "Amazon", "Other"];
const CADENCES = ["biweekly", "monthly", "weekly", "as_needed"];

export default function AdminIngredientsPage() {
  const [items, setItems] = useState<IngredientItem[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parDraft, setParDraft] = useState("");
  const [onHandDraft, setOnHandDraft] = useState("");
  const [editField, setEditField] = useState<"par" | "on_hand" | null>(null);

  const [form, setForm] = useState({ ingredient_name: "", par_level: "", vendor: "HEB", cadence: "biweekly", unit: "each", area: "general", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingRes, ordRes] = await Promise.all([
        fetch("/api/admin/ingredients", { cache: "no-store" }),
        fetch("/api/admin/orders", { cache: "no-store" }),
      ]);
      const ingData = await ingRes.json();
      const ordData = await ordRes.json();
      if (ingRes.ok) setItems(ingData.items ?? []);
      if (ordRes.ok) setOrders(ordData.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient_name: form.ingredient_name,
          par_level: Number(form.par_level),
          vendor: form.vendor,
          cadence: form.cadence,
          unit: form.unit,
          area: form.area,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setForm({ ingredient_name: "", par_level: "", vendor: "HEB", cadence: "biweekly", unit: "each", area: "general", notes: "" });
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function deletePar(id: string) {
    if (!confirm("Remove this ingredient par?")) return;
    try {
      await fetch(`/api/admin/ingredients?id=${id}`, { method: "DELETE" });
      await load();
    } catch { /* best-effort */ }
  }

  function startEdit(item: IngredientItem, field: "par" | "on_hand") {
    setEditingId(item.id);
    setEditField(field);
    if (field === "par") setParDraft(String(item.par_level ?? ""));
    else setOnHandDraft(item.on_hand != null ? String(item.on_hand) : "");
  }

  async function savePar(id: string) {
    const par = Number(parDraft);
    if (!Number.isFinite(par) || par < 0) { setEditingId(null); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, par_level: par }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      setEditingId(null); setEditField(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally { setSaving(false); }
  }

  async function saveOnHand(id: string) {
    if (onHandDraft.trim() === "") { setEditingId(null); setEditField(null); return; }
    const qty = Number(onHandDraft);
    if (!Number.isFinite(qty) || qty < 0) { setEditingId(null); setEditField(null); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, on_hand: qty }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      setEditingId(null); setEditField(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally { setSaving(false); }
  }

  async function generateOrders() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor: "All" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate orders");
    } finally {
      setGenerating(false);
    }
  }

  async function updateOrderStatus(id: string, status: string) {
    try {
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } catch { /* best-effort */ }
  }

  const filteredItems = vendorFilter === "all" ? items : items.filter((i) => i.vendor === vendorFilter);
  const needsOrderCount = items.filter((i) => i.needs_order).length;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Boxes className="h-7 w-7 text-forest" /> Ingredients & Ordering
          </h1>
          <p className="text-sm text-mocha">
            {items.length} par targets · {needsOrderCount} need ordering · {orders.length} purchase orders
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Par
        </button>
        <button onClick={generateOrders} disabled={generating || needsOrderCount === 0} className="btn-primary text-sm disabled:opacity-50">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
          Generate Orders ({needsOrderCount})
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Vendor filter */}
      <div className="mb-4 flex gap-2">
        {["all", ...VENDORS].map((v) => (
          <button key={v} onClick={() => setVendorFilter(v)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", vendorFilter === v ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10")}>
            {v === "all" ? "All vendors" : v}
          </button>
        ))}
      </div>

      {/* Ingredients table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
          No ingredient pars set up yet. Click "Add Par" to start.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-latte/20 bg-cream text-left text-mocha">
                <th className="px-4 py-3 font-medium">Ingredient</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Cadence</th>
                <th className="px-4 py-3 text-center font-medium">Par</th>
                <th className="px-4 py-3 text-center font-medium">On Hand</th>
                <th className="px-4 py-3 text-center font-medium">Order Qty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10">
              {filteredItems.map((item) => (
                <tr key={item.id} className={item.needs_order ? "bg-bronze/5" : ""}>
                  <td className="px-4 py-3 font-medium text-espresso">
                    {item.ingredient_name}
                    <span className="ml-2 text-xs text-mocha">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-mocha">{item.vendor}</td>
                  <td className="px-4 py-3 text-mocha capitalize">{item.cadence}</td>
                  <td className="px-4 py-3 text-center text-espresso">
                    {editingId === item.id && editField === "par" ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          step="0.5"
                          value={parDraft}
                          onChange={(e) => setParDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePar(item.id);
                            if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                          }}
                          onBlur={() => savePar(item.id)}
                          className="w-16 rounded-lg border border-forest/50 bg-background px-2 py-1 text-center text-sm text-foreground"
                        />
                        <button type="button" onClick={() => savePar(item.id)} disabled={saving} className="rounded-md bg-forest p-1 text-sand disabled:opacity-50" aria-label="Save par">
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(item, "par")}
                        className="group inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-foreground hover:bg-latte/10 hover:text-forest"
                        title="Edit par"
                      >
                        {item.par_level}
                        <Pencil className="h-3 w-3 text-mocha opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-mocha">
                    {editingId === item.id && editField === "on_hand" ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          step="0.5"
                          value={onHandDraft}
                          onChange={(e) => setOnHandDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveOnHand(item.id);
                            if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                          }}
                          onBlur={() => saveOnHand(item.id)}
                          className="w-16 rounded-lg border border-forest/50 bg-background px-2 py-1 text-center text-sm text-foreground"
                        />
                        <button type="button" onClick={() => saveOnHand(item.id)} disabled={saving} className="rounded-md bg-forest p-1 text-sand disabled:opacity-50" aria-label="Save on-hand">
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(item, "on_hand")}
                        className="group inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-mocha hover:bg-latte/10 hover:text-foreground"
                        title={item.on_hand != null ? "Edit on-hand count" : "Enter on-hand count"}
                      >
                        {item.on_hand ?? "—"}
                        <Pencil className="h-3 w-3 text-mocha opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-espresso">{item.order_qty ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {item.needs_order ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bronze/15 px-2.5 py-0.5 text-xs font-medium text-espresso">
                        <Package className="h-3 w-3" /> Order
                      </span>
                    ) : item.on_hand != null ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">OK</span>
                    ) : (
                      <span className="rounded-full bg-latte/20 px-2.5 py-0.5 text-xs font-medium text-mocha">No count</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deletePar(item.id)} className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Purchase orders */}
      {orders.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-bold text-espresso">Purchase Orders</h2>
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-latte/20 bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-bold text-espresso">{o.vendor} Order</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                      o.status === "draft" ? "bg-blue-100 text-blue-700"
                      : o.status === "approved" ? "bg-green-100 text-green-700"
                      : o.status === "ordered" ? "bg-purple-100 text-purple-700"
                      : o.status === "received" ? "bg-forest/15 text-forest"
                      : "bg-red-100 text-red-700"
                    )}>{o.status}</span>
                  </div>
                  <span className="text-xs text-mocha">{new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {o.items?.length ?? 0} items</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(o.items ?? []).map((item, i) => (
                    <span key={i} className="rounded-lg bg-latte/10 px-2.5 py-1 text-xs text-espresso">
                      {item.name}: <strong>{item.qty}</strong> {item.unit}
                    </span>
                  ))}
                </div>
                {o.status === "draft" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => updateOrderStatus(o.id, "approved")} className="rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-sand">Approve</button>
                    <button onClick={() => updateOrderStatus(o.id, "cancelled")} className="rounded-lg border border-latte/30 px-3 py-1.5 text-xs text-mocha hover:text-red-600">Cancel</button>
                  </div>
                )}
                {o.status === "approved" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => updateOrderStatus(o.id, "ordered")} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white">Mark Ordered</button>
                  </div>
                )}
                {o.status === "ordered" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => updateOrderStatus(o.id, "received")} className="rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-sand">Mark Received</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add par modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <form onSubmit={addPar} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-espresso">Add Ingredient Par</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg p-1 text-mocha hover:bg-latte/20"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-espresso">
                Ingredient Name *
                <input required value={form.ingredient_name} onChange={(e) => setForm({ ...form, ingredient_name: e.target.value })} className="input-field mt-1" placeholder="Whole milk" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-espresso">
                  Par Level *
                  <input required type="number" min="0" step="0.5" value={form.par_level} onChange={(e) => setForm({ ...form, par_level: e.target.value })} className="input-field mt-1" placeholder="6" />
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Unit
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field mt-1" placeholder="gal" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-espresso">
                  Vendor
                  <select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="select-field mt-1">
                    {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Cadence
                  <select value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })} className="select-field mt-1">
                    {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-espresso">
                Area
                <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="select-field mt-1">
                  <option value="general">General</option>
                  <option value="bar">Bar</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="retail">Retail</option>
                  <option value="bakery">Bakery</option>
                  <option value="storage">Storage</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

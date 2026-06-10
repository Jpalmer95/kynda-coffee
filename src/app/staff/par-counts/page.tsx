"use client";

/**
 * /staff/par-counts — staff submit on-hand inventory counts vs par levels.
 * Recent counts shown below; items under par are flagged. Feeds the
 * inventory brain (Epic 7) and leadership ordering decisions.
 */

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, Plus, Save, Trash2 } from "lucide-react";

interface ParCount {
  id: string;
  item_name: string;
  area: string;
  unit: string;
  par_level: number | null;
  counted_qty: number;
  notes: string | null;
  counted_at: string;
  profiles?: { full_name: string | null } | null;
}

interface DraftRow {
  item_name: string;
  area: string;
  unit: string;
  par_level: string;
  counted_qty: string;
  notes: string;
}

const AREAS = ["general", "bar", "kitchen", "retail", "bakery", "storage"];
const emptyRow = (): DraftRow => ({ item_name: "", area: "general", unit: "each", par_level: "", counted_qty: "", notes: "" });

export default function ParCountsPage() {
  const [counts, setCounts] = useState<ParCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/par-counts?days=7", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCounts(data.counts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setRow(i: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    const valid = rows.filter((r) => r.item_name.trim() && r.counted_qty !== "");
    if (valid.length === 0) {
      setError("Add at least one item with a count.");
      return;
    }
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/staff/par-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counts: valid.map((r) => ({
            item_name: r.item_name,
            area: r.area,
            unit: r.unit,
            par_level: r.par_level === "" ? undefined : Number(r.par_level),
            counted_qty: Number(r.counted_qty),
            notes: r.notes || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSavedMsg(`Saved ${data.saved} count${data.saved === 1 ? "" : "s"}.`);
      setRows([emptyRow()]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-forest" />
          <div>
            <h1 className="font-heading text-2xl font-bold text-espresso">Par Counts</h1>
            <p className="text-sm text-mocha">Count what&apos;s on hand — items under par get flagged for ordering.</p>
          </div>
        </div>

        {/* Entry form */}
        <div className="space-y-3 rounded-2xl border border-latte/20 bg-card p-5">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
              <label className="col-span-2 block text-sm sm:col-span-3">
                {i === 0 && <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Item</span>}
                <input value={r.item_name} onChange={(e) => setRow(i, { item_name: e.target.value })} placeholder="Whole milk" className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              </label>
              <label className="block text-sm sm:col-span-2">
                {i === 0 && <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Area</span>}
                <select value={r.area} onChange={(e) => setRow(i, { area: e.target.value })} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm capitalize text-espresso">
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                {i === 0 && <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Unit</span>}
                <input value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} placeholder="gal" className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              </label>
              <label className="block text-sm sm:col-span-2">
                {i === 0 && <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Par</span>}
                <input type="number" min="0" step="0.5" value={r.par_level} onChange={(e) => setRow(i, { par_level: e.target.value })} placeholder="6" className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              </label>
              <label className="block text-sm sm:col-span-2">
                {i === 0 && <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">On hand</span>}
                <input type="number" min="0" step="0.5" value={r.counted_qty} onChange={(e) => setRow(i, { counted_qty: e.target.value })} placeholder="4" className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              </label>
              <div className="flex sm:col-span-1">
                <button onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} disabled={rows.length === 1} className="rounded-lg border border-latte/30 p-2 text-mocha hover:text-red-600 disabled:opacity-30" aria-label="Remove row">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button onClick={() => setRows((prev) => [...prev, emptyRow()])} className="flex items-center gap-2 rounded-xl border border-latte/30 px-4 py-2 text-sm text-espresso hover:border-forest/50">
              <Plus className="h-4 w-4" /> Add Item
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2 text-sm font-medium text-sand disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Counts
            </button>
            {savedMsg && <span className="text-sm text-green-700">{savedMsg}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>

        {/* Recent counts */}
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-espresso">Last 7 Days</h2>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading counts...
            </div>
          ) : counts.length === 0 ? (
            <p className="text-sm text-mocha">No counts submitted yet this week.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">On hand</th>
                    <th className="px-4 py-3">Par</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">By</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c) => {
                    const under = c.par_level != null && Number(c.counted_qty) < Number(c.par_level);
                    return (
                      <tr key={c.id} className="border-b border-latte/10 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-espresso">{c.item_name}</td>
                        <td className="px-4 py-2.5 capitalize text-mocha">{c.area}</td>
                        <td className="px-4 py-2.5 text-espresso">{c.counted_qty} {c.unit}</td>
                        <td className="px-4 py-2.5 text-mocha">{c.par_level ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {c.par_level == null ? (
                            <span className="text-xs text-mocha">—</span>
                          ) : under ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Order</span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">OK</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-mocha">{c.profiles?.full_name || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-mocha">{new Date(c.counted_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

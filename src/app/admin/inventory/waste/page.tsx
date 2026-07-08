"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
} from "lucide-react";

type WasteEntry = {
  id: string;
  logged_by: string | null;
  waste_date: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost_cents: number;
  total_cost_cents: number;
  reason: string;
  notes: string | null;
  shift: string | null;
  created_at: string;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const REASONS = ["broken", "expired", "damaged", "returned", "spoilage", "overpour", "theft", "sample", "other"];
const SHIFTS = ["opening", "midday", "closing", "all_day"];

export default function WasteLogPage() {
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterReason, setFilterReason] = useState("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formUnit, setFormUnit] = useState("each");
  const [formCost, setFormCost] = useState("");
  const [formReason, setFormReason] = useState("spoilage");
  const [formShift, setFormShift] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/waste", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load waste log");
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load waste log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          quantity: parseFloat(formQty) || 1,
          unit: formUnit,
          unit_cost_cents: Math.round((parseFloat(formCost) || 0) * 100),
          reason: formReason,
          shift: formShift || null,
          notes: formNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add entry");
      setFormName(""); setFormQty("1"); setFormCost(""); setFormNotes("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this waste entry?")) return;
    try {
      const res = await fetch(`/api/admin/inventory/waste?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => filterReason === "all" || e.reason === filterReason);
  }, [entries, filterReason]);

  const totalCost = filteredEntries.reduce((sum, e) => sum + e.total_cost_cents, 0);

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/inventory" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <TrendingDown className="h-7 w-7 text-bronze" />
            Waste Log
          </h1>
          <p className="text-sm text-mocha">
            Track broken, expired, damaged, returned goods • {filteredEntries.length} entries • {money(totalCost)} total
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          <Plus className="mr-2 h-4 w-4" /> Log Waste
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-bronze/30 bg-bronze/10 p-3 text-sm text-espresso">{error}</div>}

      {showForm && (
        <form onSubmit={submitEntry} className="mb-6 rounded-2xl border border-latte/20 bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-medium text-espresso">
              Item name *
              <input required value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field mt-1" placeholder="e.g., 2% Milk Gallon" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Quantity
              <input type="number" step="0.01" value={formQty} onChange={(e) => setFormQty(e.target.value)} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Unit
              <input value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="input-field mt-1" placeholder="each, lb, oz, gal" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Unit cost ($)
              <input type="number" step="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} className="input-field mt-1" placeholder="0.00" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Reason
              <select value={formReason} onChange={(e) => setFormReason(e.target.value)} className="select-field mt-1">
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-espresso">
              Shift
              <select value={formShift} onChange={(e) => setFormShift(e.target.value)} className="select-field mt-1">
                <option value="">—</option>
                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-espresso sm:col-span-2 lg:col-span-3">
              Notes
              <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="input-field mt-1" placeholder="Optional context" />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Entry
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterReason("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filterReason === "all" ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}
        >
          All
        </button>
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setFilterReason(r)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filterReason === r ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}
          >
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading waste log...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center">
          <TrendingDown className="mx-auto h-12 w-12 text-mocha/40" />
          <p className="mt-4 text-mocha">No waste entries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-latte/20 bg-cream text-left text-mocha">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 text-center font-medium">Qty</th>
                <th className="px-4 py-3 text-center font-medium">Cost/Unit</th>
                <th className="px-4 py-3 text-center font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Shift</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-latte/5">
                  <td className="px-4 py-3 text-mocha">
                    {new Date(entry.waste_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-espresso">{entry.name}</div>
                    {entry.notes && <div className="text-xs text-mocha">{entry.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-bronze/10 px-2.5 py-0.5 text-xs font-medium text-espresso">{entry.reason}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-espresso">{entry.quantity} {entry.unit}</td>
                  <td className="px-4 py-3 text-center text-mocha">{money(entry.unit_cost_cents)}</td>
                  <td className="px-4 py-3 text-center font-semibold text-bronze">{money(entry.total_cost_cents)}</td>
                  <td className="px-4 py-3 text-mocha">{entry.shift ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteEntry(entry.id)} className="rounded-full p-1.5 text-mocha hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-latte/20 bg-cream">
                <td colSpan={5} className="px-4 py-3 text-right font-medium text-espresso">Total:</td>
                <td className="px-4 py-3 text-center font-bold text-bronze">{money(totalCost)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

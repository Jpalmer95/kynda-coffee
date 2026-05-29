"use client";

import { useState } from "react";
import { Plus, Clock, AlertTriangle } from "lucide-react";

interface WasteEntry {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  reason: "expired" | "spilled" | "customer-complaint" | "damaged" | "over-prepared" | "other";
  cost_cents: number;
  notes?: string;
  created_at: string;
}

interface WasteLogClientProps {
  initialEntries: WasteEntry[];
  productOptions: { id: string; name: string; cost_cents: number; unit: string }[];
}

const REASONS = [
  { value: "expired", label: "Expired", emoji: "📅" },
  { value: "spilled", label: "Spilled", emoji: "💧" },
  { value: "customer-complaint", label: "Customer Complaint", emoji: "😕" },
  { value: "damaged", label: "Damaged", emoji: "💔" },
  { value: "over-prepared", label: "Over-prepared", emoji: "📈" },
  { value: "other", label: "Other", emoji: "📝" },
] as const;

export function WasteLogClient({
  initialEntries,
  productOptions,
}: WasteLogClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    product_id: "",
    quantity: "",
    reason: "expired" as WasteEntry["reason"],
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id || !form.quantity) return;

    const product = productOptions.find((p) => p.id === form.product_id);
    if (!product) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: form.product_id,
          quantity: parseFloat(form.quantity),
          unit: product.unit,
          reason: form.reason,
          cost_cents: Math.round(product.cost_cents * parseFloat(form.quantity)),
          notes: form.notes || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEntries((prev) => [data.entry, ...prev]);
        setForm({ product_id: "", quantity: "", reason: "expired", notes: "" });
        setShowForm(false);
      }
    } catch (err) {
      alert("Failed to log waste");
    } finally {
      setSubmitting(false);
    }
  }

  // Summary stats
  const todayEntries = entries.filter((e) => {
    const today = new Date().toISOString().split("T")[0];
    return e.created_at.startsWith(today);
  });
  const todayCostCents = todayEntries.reduce((sum, e) => sum + e.cost_cents, 0);
  const totalCostCents = entries.reduce((sum, e) => sum + e.cost_cents, 0);

  // Group by reason
  const byReason = REASONS.map((r) => ({
    ...r,
    count: entries.filter((e) => e.reason === r.value).length,
    cost: entries
      .filter((e) => e.reason === r.value)
      .reduce((sum, e) => sum + e.cost_cents, 0),
  }));

  return (
    <div>
      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today's Entries"
          value={todayEntries.length.toString()}
          hint={`${entries.length} total`}
        />
        <StatCard
          label="Today's Loss"
          value={`$${(todayCostCents / 100).toFixed(2)}`}
          hint="Estimated cost"
          alert={todayCostCents > 5000}
        />
        <StatCard
          label="All-Time Loss"
          value={`$${(totalCostCents / 100).toFixed(2)}`}
          hint={`${entries.length} total entries`}
        />
      </div>

      {/* Reason breakdown */}
      {entries.length > 0 && (
        <div className="mb-8 rounded-xl border border-latte/20 bg-card p-5">
          <h3 className="mb-3 font-heading text-lg font-bold text-espresso">
            Waste by Reason
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byReason
              .filter((r) => r.count > 0)
              .map((r) => (
                <div
                  key={r.value}
                  className="flex items-center justify-between rounded-lg bg-background p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{r.emoji}</span>
                    <span className="text-espresso font-medium">{r.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-mocha">{r.count} entries</div>
                    <div className="font-bold text-espresso">
                      ${(r.cost / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add button */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-espresso">
          Recent Entries
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-sand hover:bg-forest/90"
        >
          <Plus className="h-4 w-4" />
          Log Waste
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-forest/30 bg-card p-5"
        >
          <h3 className="mb-4 font-heading text-lg font-bold text-espresso">
            Log Waste Entry
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-mocha uppercase tracking-wide">
                Product
              </label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select product...</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (per {p.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mocha uppercase tracking-wide">
                Quantity
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-mocha uppercase tracking-wide">
                Reason
              </label>
              <div className="flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm({ ...form, reason: r.value })}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                      form.reason === r.value
                        ? "bg-forest text-sand"
                        : "bg-background border border-latte/30 text-espresso"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-mocha uppercase tracking-wide">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="What happened?"
                className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-forest px-5 py-2 text-sm font-medium text-sand hover:bg-forest/90 disabled:opacity-50"
            >
              {submitting ? "Logging..." : "Log Waste"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-latte/30 px-5 py-2 text-sm font-medium text-mocha hover:bg-background"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-lg border border-latte/10 bg-card p-4"
          >
            <div className="mt-0.5 text-xl">
              {REASONS.find((r) => r.value === entry.reason)?.emoji || "📝"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-espresso">
                    {entry.product_name}
                  </h4>
                  <p className="text-xs text-mocha">
                    {entry.quantity} {entry.unit} · {entry.reason.replace("-", " ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-red-600">
                    ${formatCents(entry.cost_cents)}
                  </div>
                  <div className="text-[10px] text-mocha">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {entry.notes && (
                <p className="mt-2 text-xs text-mocha italic">{entry.notes}</p>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-latte/40 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-mocha/40" />
            <p className="mt-2 text-mocha">No waste logged yet. That&apos;s great news!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        alert ? "border-red-200 bg-red-50" : "border-latte/20 bg-card"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-mocha">
        {label}
      </div>
      <div
        className={`mt-2 font-heading text-3xl font-bold ${
          alert ? "text-red-600" : "text-espresso"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-mocha">{hint}</div>
    </div>
  );
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

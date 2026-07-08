"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Download,
  Loader2,
  Save,
  Search,
} from "lucide-react";

type CountItem = {
  id: string;
  count_id: string;
  pos_item_id: string | null;
  pos_variation_id: string | null;
  product_id: string | null;
  name: string;
  variation_name: string | null;
  sku: string | null;
  category: string | null;
  unit: string | null;
  system_stock: number;
  counted_stock: number | null;
  unit_cost_cents: number;
  sort_order: number;
};

type Count = {
  id: string;
  count_date: string;
  counted_by: string | null;
  status: string;
  total_variance_cents: number;
  total_expected_cents: number;
  total_counted_cents: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CountSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const [countId, setCountId] = useState<string | null>(null);
  const [count, setCount] = useState<Count | null>(null);
  const [items, setItems] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "counted" | "uncounted" | "variance">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setCountId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!countId) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/inventory/counts?id=${countId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load count");
      setCount(data.count);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load count");
    } finally {
      setLoading(false);
    }
  }, [countId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateItem(itemId: string, countedStock: number | null) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, counted_stock: countedStock } : item
      )
    );
  }

  async function saveItem(item: CountItem) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/counts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count_id: countId,
          item_id: item.id,
          counted_stock: item.counted_stock,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function finalize() {
    if (!confirm("Finalize this count? This will lock it and compute the variance report.")) return;
    setFinalizing(true);
    try {
      const res = await fetch("/api/admin/inventory/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", count_id: countId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Finalize failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finalize failed");
    } finally {
      setFinalizing(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["Name", "Variation", "SKU", "Category", "System Stock", "Counted Stock", "Variance", "Unit Cost", "Variance Cost"],
      ...items.map((item) => {
        const variance = (item.counted_stock ?? 0) - item.system_stock;
        const varianceCost = variance * item.unit_cost_cents;
        return [
          item.name,
          item.variation_name ?? "",
          item.sku ?? "",
          item.category ?? "",
          item.system_stock,
          item.counted_stock ?? "",
          variance,
          money(item.unit_cost_cents),
          money(varianceCost),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-count-${count?.count_date ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [item.name, item.variation_name, item.sku, item.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
    const isCounted = item.counted_stock !== null;
    const variance = (item.counted_stock ?? 0) - item.system_stock;
    const matchesFilter =
      filter === "all" ||
      (filter === "counted" && isCounted) ||
      (filter === "uncounted" && !isCounted) ||
      (filter === "variance" && isCounted && variance !== 0);
    return matchesSearch && matchesFilter;
  });

  const countedCount = items.filter((i) => i.counted_stock !== null).length;
  const progressPct = items.length > 0 ? Math.round((countedCount / items.length) * 100) : 0;
  const isCompleted = count?.status === "completed";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-mocha">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading count sheet...
      </div>
    );
  }

  if (!count) {
    return (
      <div className="rounded-2xl border border-latte/20 bg-card py-20 text-center text-mocha">
        Count not found.{" "}
        <Link href="/admin/inventory/counts" className="text-forest underline">Back to counts</Link>
      </div>
    );
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/inventory/counts" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <ClipboardList className="h-7 w-7 text-forest" />
            Count Sheet — {new Date(count.count_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h1>
          <p className="text-sm text-mocha">
            {countedCount} / {items.length} items counted ({progressPct}%) •
            Status: <span className={isCompleted ? "font-semibold text-sage" : "font-semibold text-bronze"}>{count.status}</span>
          </p>
        </div>
        {!isCompleted && (
          <button onClick={finalize} disabled={finalizing} className="btn-primary text-sm">
            {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Finalize Count
          </button>
        )}
        <button onClick={exportCSV} className="btn-secondary text-sm">
          <Download className="mr-2 h-4 w-4" /> CSV
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-bronze/30 bg-bronze/10 p-3 text-sm text-espresso">{error}</div>}

      {/* Progress bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-latte/20">
        <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Summary (when finalized) */}
      {isCompleted && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-latte/20 bg-card p-4">
            <p className="text-xs text-mocha">Expected Value</p>
            <p className="font-heading text-xl font-bold text-espresso">{money(count.total_expected_cents)}</p>
          </div>
          <div className="rounded-xl border border-latte/20 bg-card p-4">
            <p className="text-xs text-mocha">Counted Value</p>
            <p className="font-heading text-xl font-bold text-espresso">{money(count.total_counted_cents)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${count.total_variance_cents < 0 ? "border-bronze/30 bg-bronze/5" : "border-sage/30 bg-sage/5"}`}>
            <p className="text-xs text-mocha">Variance</p>
            <p className={`font-heading text-xl font-bold ${count.total_variance_cents < 0 ? "text-bronze" : "text-sage"}`}>
              {count.total_variance_cents >= 0 ? "+" : ""}{money(count.total_variance_cents)}
            </p>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1"
        />
        <div className="flex gap-2">
          {(["all", "uncounted", "counted", "variance"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${filter === f ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"}`}
            >
              {f === "all" ? "All" : f === "uncounted" ? "Uncounted" : f === "counted" ? "Counted" : "Variance"}
            </button>
          ))}
        </div>
      </div>

      {/* Count sheet table */}
      <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-latte/20 bg-cream text-left text-mocha">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 text-center font-medium">System</th>
              <th className="px-4 py-3 text-center font-medium">Counted</th>
              <th className="px-4 py-3 text-center font-medium">Variance</th>
              <th className="px-4 py-3 text-center font-medium">Cost/Unit</th>
              <th className="px-4 py-3 text-center font-medium">Var $</th>
              {!isCompleted && <th className="px-4 py-3 text-center font-medium">Save</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={isCompleted ? 7 : 8} className="px-4 py-8 text-center text-mocha">No items found.</td>
              </tr>
            )}
            {filteredItems.map((item) => {
              const variance = (item.counted_stock ?? 0) - item.system_stock;
              const varianceCost = variance * item.unit_cost_cents;
              const hasVariance = item.counted_stock !== null && variance !== 0;
              return (
                <tr key={item.id} className={hasVariance ? "bg-bronze/5" : ""}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-espresso">{item.name}</div>
                    {item.variation_name && <div className="text-xs text-mocha">{item.variation_name}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-mocha">{item.sku || "—"}</td>
                  <td className="px-4 py-3 text-center text-espresso">{item.system_stock}</td>
                  <td className="px-4 py-3 text-center">
                    {isCompleted ? (
                      <span className="font-semibold text-espresso">{item.counted_stock ?? "—"}</span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={item.counted_stock ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value);
                          updateItem(item.id, val);
                        }}
                        onBlur={() => saveItem(item)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-20 rounded-lg border border-latte/40 bg-card px-2 py-1 text-center text-sm focus:border-forest focus:outline-none"
                        placeholder="—"
                      />
                    )}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${hasVariance ? (variance < 0 ? "text-bronze" : "text-sage") : "text-mocha"}`}>
                    {item.counted_stock !== null ? (variance >= 0 ? "+" : "") + variance : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-mocha">{money(item.unit_cost_cents)}</td>
                  <td className={`px-4 py-3 text-center font-medium ${hasVariance ? (varianceCost < 0 ? "text-bronze" : "text-sage") : "text-mocha"}`}>
                    {item.counted_stock !== null ? (varianceCost >= 0 ? "+" : "") + money(varianceCost) : "—"}
                  </td>
                  {!isCompleted && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => saveItem(item)}
                        disabled={saving}
                        className="rounded-full bg-latte/20 p-1.5 text-mocha hover:bg-latte/40 disabled:opacity-50"
                        title="Save this line"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-mocha">
        Tip: Tab through the count column and press Enter to save each line. Finalize when done to lock the count and compute the variance report.
      </p>
    </div>
  );
}

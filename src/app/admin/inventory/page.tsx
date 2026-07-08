"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ClipboardList, Loader2, Package, RefreshCw, TrendingDown } from "lucide-react";
import MenuMetricsPanel from "@/components/admin/MenuMetricsPanel";

type InventoryItem = {
  id: string;
  name: string;
  variationName: string;
  category: "Cafe" | "Merch";
  stock: number | null;
  threshold: number;
  sku: string | null;
  lastUpdated: string | null;
  trackInventory: boolean;
  source: "Square" | "Online";
};

function updatedLabel(value: string | null) {
  if (!value) return "Not synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"All" | "Cafe" | "Merch" | "Low" | "Untracked">("All");

  async function loadInventory() {
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to load inventory");
      setItems(data.inventory ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function syncSquare() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/square/sync-catalog", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Square sync failed");
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Square sync failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || [item.name, item.variationName, item.sku, item.source].filter(Boolean).join(" ").toLowerCase().includes(query);
      const low = item.trackInventory && item.stock !== null && item.stock < item.threshold;
      const matchesFilter =
        filter === "All" ||
        (filter === "Low" && low) ||
        (filter === "Untracked" && !item.trackInventory) ||
        item.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, items, searchTerm]);

  const lowStockCount = items.filter((item) => item.trackInventory && item.stock !== null && item.stock < item.threshold).length;
  const untrackedCount = items.filter((item) => !item.trackInventory).length;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/10" aria-label="Back to admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
              <Package className="h-8 w-8 text-forest" /> Inventory Management
            </h1>
            <p className="text-sm text-mocha">
              Square + online inventory • {lowStockCount} low-stock • {untrackedCount} untracked
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/inventory/counts" className="btn-secondary text-sm">
            <ClipboardList className="mr-2 h-4 w-4" /> Count Sheets
          </Link>
          <Link href="/admin/inventory/waste" className="btn-secondary text-sm">
            <TrendingDown className="mr-2 h-4 w-4" /> Waste Log
          </Link>
          <button className="btn-primary text-sm" onClick={syncSquare} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Square
          </button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl border border-bronze/30 bg-bronze/10 p-4 text-sm text-espresso">{error}</div>}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <input
          type="text"
          placeholder="Search by name, variation, SKU, source..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input-field flex-1"
        />
        <div className="flex flex-wrap gap-2">
          {(["All", "Cafe", "Merch", "Low", "Untracked"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                filter === item ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading inventory...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-latte/20 bg-cream text-left text-mocha">
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">SKU</th>
                <th className="px-6 py-3 text-center font-medium">Stock</th>
                <th className="px-6 py-3 text-center font-medium">Threshold</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Last Synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-mocha">No inventory items found.</td>
                </tr>
              )}
              {filteredItems.map((item) => {
                const isLow = item.trackInventory && item.stock !== null && item.stock < item.threshold;
                return (
                  <tr key={item.id} className={isLow ? "bg-bronze/5" : ""}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-espresso">{item.name}</div>
                      <div className="text-xs text-mocha">{item.variationName}</div>
                    </td>
                    <td className="px-6 py-4 text-mocha">{item.source}</td>
                    <td className="px-6 py-4 text-mocha">{item.category}</td>
                    <td className="px-6 py-4 font-mono text-xs text-espresso/80">{item.sku || "—"}</td>
                    <td className="px-6 py-4 text-center font-semibold text-espresso">{item.trackInventory ? item.stock ?? "Unknown" : "Not tracked"}</td>
                    <td className="px-6 py-4 text-center text-mocha">{item.trackInventory ? item.threshold : "—"}</td>
                    <td className="px-6 py-4 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-bronze/15 px-3 py-1 text-xs font-medium text-espresso">
                          <AlertTriangle className="h-3.5 w-3.5" /> Low stock
                        </span>
                      ) : item.trackInventory ? (
                        <span className="inline-block rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-sage">Healthy</span>
                      ) : (
                        <span className="inline-block rounded-full bg-latte/20 px-3 py-1 text-xs font-medium text-mocha">Untracked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-mocha">{updatedLabel(item.lastUpdated)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-mocha">
        Inventory is read from normalized Square catalog variations and online product stock. Use Square as the source of truth for café items.
      </div>

      {/* MenuMetrics: recipe costing, ingredient stock, vendor price watch (manager+) */}
      <MenuMetricsPanel />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Package, RefreshCw } from "lucide-react";

type InventoryItem = {
  id: string;
  name: string;
  category: "Cafe" | "Merch";
  stock: number;
  threshold: number;
  sku: string;
  lastUpdated: string;
  reorderQty?: number;
};

const initialInventory: InventoryItem[] = [
  { id: "1", name: "Ethiopian Guji Bean (12oz)", category: "Cafe", stock: 38, threshold: 15, sku: "ETH-GUJI-12", lastUpdated: "Just now" },
  { id: "2", name: "Honduras Finca Yaque (12oz)", category: "Cafe", stock: 4, threshold: 10, sku: "HON-FINCA-12", lastUpdated: "2h ago", reorderQty: 50 },
  { id: "3", name: "Kynda Mug - Ceramic", category: "Merch", stock: 22, threshold: 8, sku: "MER-MUG-CER", lastUpdated: "Yesterday" },
  { id: "4", name: "Kynda T-Shirt (Black, M)", category: "Merch", stock: 7, threshold: 5, sku: "MER-TEE-BLK-M", lastUpdated: "3h ago" },
  { id: "5", name: "Americano Glass Mug", category: "Merch", stock: 15, threshold: 6, sku: "MER-GLASS-AMER", lastUpdated: "Just now" },
  { id: "6", name: "Colombia Supremo (12oz)", category: "Cafe", stock: 19, threshold: 12, sku: "COL-SUP-12", lastUpdated: "Yesterday" },
  { id: "7", name: "Kynda Cap (Navy)", category: "Merch", stock: 3, threshold: 5, sku: "MER-CAP-NAV", lastUpdated: "1d ago", reorderQty: 20 },
];

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"All" | "Cafe" | "Merch" | "Low">("All");

  const lowStockCount = items.filter((i) => i.stock < i.threshold).length;

  const filteredItems = items
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filter === "All" ||
        (filter === "Low" && item.stock < item.threshold) ||
        item.category === filter;
      return matchesSearch && matchesFilter;
    });

  function updateStock(id: string, newStock: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, stock: Math.max(0, newStock), lastUpdated: "Just now" }
          : item
      )
    );
  }

  function updateThreshold(id: string, newThreshold: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, threshold: Math.max(1, newThreshold) } : item
      )
    );
  }

  function logLowStockAlert(item: InventoryItem) {
    console.log(`[Inventory] Low stock alert triggered for: ${item.name} (${item.stock} left)`);
    // In real app, this would POST to /api/admin/notifications
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8 text-forest" /> Inventory Management
          </h1>
          <p className="text-sm text-mocha">
            Café (Square) + Merch (Printful) • {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} below threshold
          </p>
        </div>
        <button className="ml-auto btn-primary flex items-center gap-2 text-sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" /> Sync from Square / Printful
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1"
        />
        <div className="flex gap-2">
          {(["All", "Cafe", "Merch", "Low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                filter === f ? "bg-surface text-sand border-surface" : "bg-white hover:bg-latte/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-latte/20 bg-cream text-left text-mocha">
              <th className="px-6 py-3 font-medium">Item</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">SKU</th>
              <th className="px-6 py-3 font-medium text-center">Current Stock</th>
              <th className="px-6 py-3 font-medium text-center">Threshold</th>
              <th className="px-6 py-3 font-medium text-center">Status</th>
              <th className="px-6 py-3 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-mocha">No items found.</td>
              </tr>
            )}
            {filteredItems.map((item) => {
              const isLow = item.stock < item.threshold;
              return (
                <tr key={item.id} className={isLow ? "bg-red-50/30" : ""}>
                  <td className="px-6 py-4 font-medium text-espresso">{item.name}</td>
                  <td className="px-6 py-4 text-mocha">{item.category}</td>
                  <td className="px-6 py-4 font-mono text-xs text-espresso/70">{item.sku}</td>

                  {/* Stock input */}
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={item.stock}
                      onChange={(e) => updateStock(item.id, parseInt(e.target.value) || 0)}
                      className="input-field w-20 text-center p-1 text-sm font-semibold"
                    />
                  </td>

                  {/* Threshold input */}
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      value={item.threshold}
                      onChange={(e) => updateThreshold(item.id, parseInt(e.target.value) || 1)}
                      className="input-field w-16 text-center p-1 text-sm"
                    />
                  </td>

                  <td className="px-6 py-4 text-center">
                    {isLow ? (
                      <button
                        onClick={() => logLowStockAlert(item)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> LOW - Send Alert
                      </button>
                    ) : (
                      <span className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-emerald-700 text-xs font-medium">Healthy</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-xs text-mocha">{item.lastUpdated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-mocha/70 text-center">
        Low-stock items automatically create an alert visible in <Link href="/admin/notifications" className="underline">Notifications</Link>.
        Reorder suggestions will be added when real Square + Printful sync is active.
      </div>
    </div>
  );
}

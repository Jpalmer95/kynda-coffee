"use client";

import { useState } from "react";
import {
  RefreshCw,
  Package,
  ShoppingCart,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface SyncStatus {
  square_connected: boolean;
  environment: string;
  location_id: string;
}

interface SyncResult {
  synced: number;
  errors: string[];
  timestamp: string;
  success: boolean;
}

export default function AdminSquarePage() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SyncResult>>({});
  const [status, setStatus] = useState<SyncStatus | null>(null);

  async function checkStatus() {
    const res = await fetch("/api/square/sync");
    const data = await res.json();
    setStatus(data);
  }

  async function runSync(type: string) {
    setSyncing(type);
    try {
      const res = await fetch("/api/square/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [type]: data.sync }));
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(null);
    }
  }

  // Load status on first render
  useState(() => {
    checkStatus();
  });

  const syncOptions = [
    {
      id: "catalog",
      name: "Catalog",
      description: "Sync products from Square to your online store",
      icon: Package,
    },
    {
      id: "inventory",
      name: "Inventory",
      description: "Update stock counts from Square POS",
      icon: BarChart3,
    },
    {
      id: "orders",
      name: "Orders",
      description: "Pull recent POS orders into your dashboard",
      icon: ShoppingCart,
    },
    {
      id: "all",
      name: "Full Sync",
      description: "Sync everything — catalog, inventory, and orders",
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-espresso">
          Square POS Sync
        </h1>
        <p className="mt-1 text-sm text-mocha">
          Sync your in-store Square POS with your online store.
        </p>
      </div>

      {/* Connection Status */}
      <div className="rounded-xl border border-latte/20 bg-white p-6">
        <h2 className="font-heading text-lg font-semibold text-espresso">
          Connection Status
        </h2>
        <div className="mt-3 flex items-center gap-3">
          {status?.square_connected ? (
            <>
              <CheckCircle className="h-5 w-5 text-sage" />
              <span className="text-sm text-espresso">
                Connected ({status.environment})
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-rust" />
              <span className="text-sm text-rust">Not connected</span>
            </>
          )}
        </div>
        {status?.location_id && (
          <p className="mt-2 text-xs text-mocha">
            Location: {status.location_id}
          </p>
        )}
      </div>

      {/* Sync Options */}
      <div className="grid gap-4 sm:grid-cols-2">
        {syncOptions.map((option) => (
          <div
            key={option.id}
            className="rounded-xl border border-latte/20 bg-white p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <option.icon className="h-5 w-5 text-mocha" />
                  <h3 className="font-heading text-lg font-semibold text-espresso">
                    {option.name}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-mocha">{option.description}</p>
              </div>
            </div>

            <button
              onClick={() => runSync(option.id)}
              disabled={syncing !== null}
              className="btn-primary mt-4 w-full"
            >
              {syncing === option.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Sync
                </>
              )}
            </button>

            {/* Result */}
            {results[option.id] && (
              <div
                className={`mt-3 rounded-lg p-3 text-sm ${
                  results[option.id].success
                    ? "bg-sage/10 text-sage"
                    : "bg-rust/10 text-rust"
                }`}
              >
                <p className="font-medium">
                  {results[option.id].success ? "✓" : "✗"} Synced{" "}
                  {results[option.id].synced} items
                </p>
                {results[option.id].errors.length > 0 && (
                  <p className="mt-1 text-xs">
                    {results[option.id].errors.length} error(s)
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Auto-sync info */}
      <div className="rounded-xl border border-latte/20 bg-cream p-6">
        <h3 className="font-heading text-lg font-semibold text-espresso">
          Auto-Sync
        </h3>
        <p className="mt-2 text-sm text-mocha">
          Webhooks from Square will automatically sync orders and inventory
          changes in real-time. Manual sync is useful for initial setup or
          bulk corrections.
        </p>
      </div>
    </div>
  );
}

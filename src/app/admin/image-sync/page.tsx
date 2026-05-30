"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ImageIcon,
  Package,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Database,
  Coffee,
} from "lucide-react";

type DiagData = {
  pos: { total: number; withImages: number; missing: { name: string; category: string; type: string }[] };
  products: { total: number; withImages: number; missing: { name: string; category: string }[] };
  mockups: { files: number };
  recentSyncLogs: any[];
  recentPosRuns: any[];
};

export default function AdminImageSyncPage() {
  const [data, setData] = useState<DiagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadDiag = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/diagnostic/images");
      if (!res.ok) throw new Error("Failed to load diagnostic");
      setData(await res.json());
    } catch (err) {
      setSyncResult({ type: "error", message: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDiag(); }, [loadDiag]);

  async function runSync(type: "catalog" | "mockups" | "both") {
    setSyncing(type);
    setSyncResult(null);

    try {
      if (type === "catalog" || type === "both") {
        const res = await fetch("/api/square/sync-catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.details || "Catalog sync failed");

        setSyncResult({
          type: "success",
          message: `Catalog sync complete: ${result.synced ?? 0} synced, ${result.failed ?? 0} failed, ${result.images?.total ?? 0} images processed`,
        });
      }

      if (type === "mockups" || type === "both") {
        const res = await fetch("/api/admin/mockups/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);

        const okCount = (result.results ?? []).filter((r: any) => r.status === "ok").length;
        setSyncResult((prev) => ({
          type: "success",
          message: [prev?.message, `Mockup sync: ${okCount} products updated`].filter(Boolean).join(". "),
        }));
      }
    } catch (err) {
      setSyncResult({ type: "error", message: String(err) });
    } finally {
      setSyncing(null);
      await loadDiag();
    }
  }

  function coveragePercent(withImages: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((withImages / total) * 100);
  }

  const lastSync = data?.recentPosRuns?.[0] || data?.recentSyncLogs?.[0];
  const lastSyncTime = lastSync?.completed_at || lastSync?.started_at;

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">Image & Sync Dashboard</h1>
              <p className="text-sm text-mocha">Monitor image coverage and trigger catalog syncs.</p>
            </div>
          </div>
          <button onClick={loadDiag} className="btn-secondary text-sm" disabled={loading || !!syncing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh Status
          </button>
        </div>

        {/* Sync Result Banner */}
        {syncResult && (
          <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
            syncResult.type === "success"
              ? "border-forest/30 bg-forest/5 text-forest"
              : "border-red-300 bg-red-50 text-red-700"
          }`}>
            {syncResult.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm">{syncResult.message}</div>
            <button onClick={() => setSyncResult(null)} className="text-xs underline opacity-60 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Sync Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {/* POS Catalog Sync */}
          <div className="rounded-2xl border border-latte/20 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-espresso">
              <Coffee className="h-5 w-5 text-forest" />
              <h2 className="font-heading font-bold">POS Catalog Sync</h2>
            </div>
            <p className="mb-4 text-sm text-mocha">
              Pulls all items from Square POS, caches images in Supabase Storage, updates the Menu and Shop pages.
            </p>
            <button
              onClick={() => runSync("catalog")}
              disabled={!!syncing}
              className="btn-accent w-full text-sm"
            >
              {syncing === "catalog" || syncing === "both" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Sync Now</>
              )}
            </button>
          </div>

          {/* Mockup Sync */}
          <div className="rounded-2xl border border-latte/20 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-espresso">
              <Sparkles className="h-5 w-5 text-forest" />
              <h2 className="font-heading font-bold">Design Studio Mockups</h2>
            </div>
            <p className="mb-4 text-sm text-mocha">
              Fetches Printful product mockups and hosts them in Supabase Storage. Populates the Design Studio canvas.
            </p>
            <button
              onClick={() => runSync("mockups")}
              disabled={!!syncing}
              className="btn-accent w-full text-sm"
            >
              {syncing === "mockups" || syncing === "both" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Sync Now</>
              )}
            </button>
          </div>

          {/* Sync Both */}
          <div className="rounded-2xl border border-forest/30 bg-forest/5 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-espresso">
              <Database className="h-5 w-5 text-forest" />
              <h2 className="font-heading font-bold">Sync Everything</h2>
            </div>
            <p className="mb-4 text-sm text-mocha">
              Run both syncs in sequence. Best for initial setup or after major catalog changes.
            </p>
            <button
              onClick={() => runSync("both")}
              disabled={!!syncing}
              className="btn-accent w-full text-sm"
            >
              {syncing === "both" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Sync All</>
              )}
            </button>
          </div>
        </div>

        {/* Status Cards */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-latte/20 bg-card py-20 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading diagnostics...
          </div>
        ) : data ? (
          <>
            {/* Last Sync Info */}
            {lastSyncTime && (
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-card/50 px-4 py-2 text-sm text-mocha border border-latte/10">
                <Clock className="h-4 w-4" />
                Last sync: {new Date(lastSyncTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                {lastSync.items_synced != null && <span className="text-espresso font-medium ml-2">({lastSync.items_synced} items synced)</span>}
              </div>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {/* POS Items */}
              <div className="rounded-2xl border border-latte/20 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-forest" />
                    <h3 className="font-medium text-sm text-espresso">Menu & POS Items</h3>
                  </div>
                  {coveragePercent(data.pos.withImages, data.pos.total) >= 80 ? (
                    <CheckCircle2 className="h-5 w-5 text-forest" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="text-3xl font-bold text-espresso tabular-nums">
                  {data.pos.withImages}/{data.pos.total}
                </div>
                <div className="text-xs text-mocha mt-1">items have images ({coveragePercent(data.pos.withImages, data.pos.total)}%)</div>
                {/* Coverage bar */}
                <div className="mt-3 h-2 rounded-full bg-latte/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${coveragePercent(data.pos.withImages, data.pos.total) >= 80 ? "bg-forest" : "bg-amber-500"}`}
                    style={{ width: `${coveragePercent(data.pos.withImages, data.pos.total)}%` }}
                  />
                </div>
              </div>

              {/* Products */}
              <div className="rounded-2xl border border-latte/20 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-forest" />
                    <h3 className="font-medium text-sm text-espresso">Shop Products</h3>
                  </div>
                  {coveragePercent(data.products.withImages, data.products.total) >= 80 ? (
                    <CheckCircle2 className="h-5 w-5 text-forest" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="text-3xl font-bold text-espresso tabular-nums">
                  {data.products.withImages}/{data.products.total}
                </div>
                <div className="text-xs text-mocha mt-1">products have images ({coveragePercent(data.products.withImages, data.products.total)}%)</div>
                <div className="mt-3 h-2 rounded-full bg-latte/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${coveragePercent(data.products.withImages, data.products.total) >= 80 ? "bg-forest" : "bg-amber-500"}`}
                    style={{ width: `${coveragePercent(data.products.withImages, data.products.total)}%` }}
                  />
                </div>
              </div>

              {/* Mockups */}
              <div className="rounded-2xl border border-latte/20 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-forest" />
                    <h3 className="font-medium text-sm text-espresso">Design Studio Mockups</h3>
                  </div>
                  {data.mockups.files >= 10 ? (
                    <CheckCircle2 className="h-5 w-5 text-forest" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="text-3xl font-bold text-espresso tabular-nums">
                  {data.mockups.files}
                </div>
                <div className="text-xs text-mocha mt-1">mockup files in Supabase Storage</div>
                <div className="mt-3 h-2 rounded-full bg-latte/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${data.mockups.files >= 10 ? "bg-forest" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (data.mockups.files / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Missing Images Detail */}
            {(data.pos.missing.length > 0 || data.products.missing.length > 0) && (
              <div className="rounded-2xl border border-latte/20 bg-card shadow-sm">
                <div className="border-b border-latte/20 p-5">
                  <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Items Missing Images
                  </h3>
                  <p className="text-sm text-mocha mt-1">
                    These items show placeholder icons. Run &quot;Sync Now&quot; above to fetch images from Square, or add images manually via catalog overrides.
                  </p>
                </div>
                <div className="p-5 space-y-6">
                  {data.pos.missing.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-espresso mb-3">POS / Menu Items ({data.pos.missing.length} missing)</h4>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {data.pos.missing.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm bg-latte/5">
                            <span className="text-espresso flex-1 truncate">{item.name}</span>
                            <span className="text-xs text-mocha shrink-0">{item.category}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-latte/20 text-mocha shrink-0">{item.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.products.missing.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-espresso mb-3">Shop Products ({data.products.missing.length} missing)</h4>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {data.products.missing.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm bg-latte/5">
                            <span className="text-espresso flex-1 truncate">{item.name}</span>
                            <span className="text-xs text-mocha shrink-0">{item.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

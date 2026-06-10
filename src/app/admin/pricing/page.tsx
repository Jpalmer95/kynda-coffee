"use client";

/**
 * /admin/pricing — Pricing Rules (Epic 2 finisher). Owner-editable per-category
 * margin / min-profit / rounding / shipping buffer, persisted in pricing_rules
 * and consumed by the live pricing engine. Every row shows a live "what would a
 * $10-cost item sell for" preview so changes are tangible.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, Loader2, RotateCcw, Save } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ProfileRow {
  category: string;
  profile: {
    targetMarginPct: number;
    minProfitCents: number;
    rounding: string;
    shippingBufferCents: number;
  };
  overridden: boolean;
  notes: string | null;
  updated_at: string | null;
  preview_1000c: number;
}

const ROUNDING_LABELS: Record<string, string> = {
  none: "Exact",
  charm_99: "$X.99",
  charm_49_99: "$X.49 / $X.99",
  nearest_5: "Nearest $0.05",
  nearest_25: "Nearest $0.25",
};

interface Draft {
  margin: string;
  minProfit: string;
  shipBuffer: string;
  rounding: string;
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [viewerRole, setViewerRole] = useState<string>("manager");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCat, setSavedCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pricing-rules", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pricing rules");
      setRows(data.profiles ?? []);
      setViewerRole(data.viewer_role ?? "manager");
      // Seed drafts from effective values
      const d: Record<string, Draft> = {};
      for (const p of data.profiles ?? []) {
        d[p.category] = {
          margin: String(Math.round(p.profile.targetMarginPct * 100)),
          minProfit: (p.profile.minProfitCents / 100).toFixed(2),
          shipBuffer: (p.profile.shippingBufferCents / 100).toFixed(2),
          rounding: p.profile.rounding,
        };
      }
      setDrafts(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = viewerRole === "owner";

  function setDraft(cat: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [cat]: { ...prev[cat], ...patch } }));
  }

  async function save(cat: string) {
    const d = drafts[cat];
    if (!d) return;
    setBusy(cat);
    setError(null);
    setSavedCat(null);
    try {
      const res = await fetch("/api/admin/pricing-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          target_margin_pct: Number(d.margin) / 100,
          min_profit_cents: Math.round(Number(d.minProfit) * 100),
          shipping_buffer_cents: Math.round(Number(d.shipBuffer) * 100),
          rounding: d.rounding,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSavedCat(cat);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function revert(cat: string) {
    setBusy(cat);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pricing-rules?category=${encodeURIComponent(cat)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revert");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revert");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading flex items-center gap-3 text-3xl font-bold">
            <BadgeDollarSign className="h-8 w-8 text-forest" /> Pricing Rules
          </h1>
          <p className="text-sm text-mocha">
            Per-category profit targets the pricing engine enforces on every sellable item.
            {!isOwner && " (Read-only — owner can edit.)"}
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading pricing rules...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Target Margin %</th>
                <th className="px-4 py-3">Min Profit $</th>
                <th className="px-4 py-3">Ship Buffer $</th>
                <th className="px-4 py-3">Rounding</th>
                <th className="px-4 py-3" title="Retail for an item costing $10.00 under this rule">$10-cost sells at</th>
                <th className="px-4 py-3">Source</th>
                {isOwner && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const d = drafts[row.category];
                if (!d) return null;
                return (
                  <tr key={row.category} className="border-b border-latte/10 last:border-0 align-middle">
                    <td className="px-4 py-2.5 font-medium text-espresso">{row.category}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min="0" max="95" step="1"
                        value={d.margin}
                        disabled={!isOwner}
                        onChange={(e) => setDraft(row.category, { margin: e.target.value })}
                        className="w-20 rounded-lg border border-latte/30 bg-background px-2 py-1.5 text-espresso disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min="0" step="0.25"
                        value={d.minProfit}
                        disabled={!isOwner}
                        onChange={(e) => setDraft(row.category, { minProfit: e.target.value })}
                        className="w-24 rounded-lg border border-latte/30 bg-background px-2 py-1.5 text-espresso disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min="0" step="0.25"
                        value={d.shipBuffer}
                        disabled={!isOwner}
                        onChange={(e) => setDraft(row.category, { shipBuffer: e.target.value })}
                        className="w-24 rounded-lg border border-latte/30 bg-background px-2 py-1.5 text-espresso disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={d.rounding}
                        disabled={!isOwner}
                        onChange={(e) => setDraft(row.category, { rounding: e.target.value })}
                        className="rounded-lg border border-latte/30 bg-background px-2 py-1.5 text-espresso disabled:opacity-60"
                      >
                        {Object.entries(ROUNDING_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-forest">
                      {formatPrice(row.preview_1000c)}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.overridden ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Custom</span>
                      ) : (
                        <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs text-mocha">Default</span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => save(row.category)}
                            disabled={busy === row.category}
                            className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-sand disabled:opacity-50"
                          >
                            {busy === row.category ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save
                          </button>
                          {row.overridden && (
                            <button
                              onClick={() => revert(row.category)}
                              disabled={busy === row.category}
                              className="flex items-center gap-1.5 rounded-lg border border-latte/30 px-3 py-1.5 text-xs text-mocha hover:text-espresso disabled:opacity-50"
                              title="Revert to engine default"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Revert
                            </button>
                          )}
                          {savedCat === row.category && <span className="text-xs text-green-700">Saved ✓</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 space-y-1 text-xs text-mocha">
        <p>• The engine guarantees profit even if a margin is set low — the cost-plus floor (cost + fees + min profit) always wins.</p>
        <p>• "$10-cost sells at" shows the live engine output for an item costing $10.00 including the shipping buffer, so you can sanity-check each rule.</p>
        <p>• Custom rules apply instantly to Design Studio quotes and Shop pricing (60s cache).</p>
      </div>
    </div>
  );
}

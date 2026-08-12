"use client";

/**
 * /staff/par-counts — fixed inventory count sheet.
 * Items + par levels load read-only from ingredient_pars (exact HEB/Amazon
 * names). Staff only enter the current on-hand count. Names & pars are locked —
 * only the owner edits those in /admin/ingredients.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Save, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetItem {
  id: string;
  ingredient_name: string;
  par_level: number | null;
  unit: string;
  vendor: string;
  area: string;
  brand: string | null;
}

interface RecentCount {
  id: string;
  item_name: string;
  counted_qty: number;
  par_level: number | null;
  unit: string;
  counted_at: string;
  profiles?: { full_name: string | null } | null;
}

const VENDORS = [
  { key: "HEB", label: "HEB" },
  { key: "Amazon", label: "Amazon" },
  { key: "all", label: "All Items" },
];

export default function ParCountsPage() {
  const [vendor, setVendor] = useState("HEB");
  const [sheet, setSheet] = useState<SheetItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({}); // item.id -> qty
  const [recent, setRecent] = useState<RecentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [sheetRes, recentRes] = await Promise.all([
        fetch(`/api/staff/par-counts?sheet=${vendor}`, { cache: "no-store" }),
        fetch("/api/staff/par-counts?days=7", { cache: "no-store" }),
      ]);
      const sheetJson = await sheetRes.json();
      const recentJson = await recentRes.json();
      if (!sheetRes.ok) throw new Error(sheetJson.error || "Failed to load sheet");
      setSheet(sheetJson.sheet ?? []);
      setRecent(recentJson.counts ?? []);
      // Clear stale count inputs when switching vendor
      setCounts({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, [vendor]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheet;
    return sheet.filter((i) => i.ingredient_name.toLowerCase().includes(q));
  }, [sheet, query]);

  const entered = useMemo(() =>
    Object.entries(counts).filter(([id, q]) => q.trim() !== "" && Number(q) >= 0).length,
    [counts]
  );

  async function save() {
    const rows = Object.entries(counts)
      .map(([id, q]) => {
        const item = sheet.find((i) => i.id === id);
        if (!item || q.trim() === "" || !Number.isFinite(Number(q))) return null;
        return {
          item_name: item.ingredient_name,
          area: item.area || "general",
          unit: item.unit || "each",
          par_level: item.par_level,
          counted_qty: Number(q),
        };
      })
      .filter(Boolean);
    if (rows.length === 0) { setError("Enter at least one count."); return; }

    setSaving(true); setError(null); setSavedMsg(null);
    try {
      const res = await fetch("/api/staff/par-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSavedMsg(`Saved ${data.saved} count${data.saved === 1 ? "" : "s"}.`);
      setCounts({});
      const recentRes = await fetch("/api/staff/par-counts?days=7", { cache: "no-store" });
      const recentJson = await recentRes.json();
      setRecent(recentJson.counts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-forest" />
          <div>
            <h1 className="font-heading text-2xl font-bold text-espresso">Inventory Count</h1>
            <p className="text-sm text-mocha">
              Enter current on-hand counts. Items &amp; par levels are locked — owners edit those in the Master Par List.
            </p>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {savedMsg && <div className="rounded-xl border border-forest/30 bg-forest/10 p-3 text-sm text-forest">{savedMsg}</div>}

        {/* Vendor tabs */}
        <div className="flex flex-wrap gap-2">
          {VENDORS.map((v) => (
            <button
              key={v.key}
              onClick={() => setVendor(v.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium",
                vendor === v.key ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${vendor === "all" ? "all" : vendor} items...`}
            className="w-full rounded-xl border border-latte/30 bg-card py-2.5 pl-10 pr-10 text-sm text-espresso"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-mocha hover:text-espresso">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading count sheet...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-latte/40 p-10 text-center text-mocha">
            No items found. {vendor !== "all" && `No ${vendor} pars seeded yet — add them in /admin/ingredients.`}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-latte/20 bg-card">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-latte/20 bg-card text-xs uppercase tracking-wide text-mocha">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3 text-center">Par</th>
                    <th className="px-4 py-3 text-center">On hand</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-latte/10 last:border-0">
                      <td className="px-4 py-2 text-espresso">{item.ingredient_name}</td>
                      <td className="px-4 py-2 text-mocha">{item.brand || item.area || "—"}</td>
                      <td className="px-4 py-2 text-center font-semibold text-espresso">{item.par_level ?? "—"}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={counts[item.id] ?? ""}
                          onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="0"
                          className="w-20 rounded-lg border border-latte/30 bg-background px-2 py-1.5 text-center text-espresso focus:border-forest/50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-latte/20 bg-card px-4 py-3">
              <span className="text-sm text-mocha">{entered} item{entered === 1 ? "" : "s"} counted of {filtered.length}</span>
              <button
                onClick={save}
                disabled={saving || entered === 0}
                className="ml-auto flex items-center gap-2 rounded-xl bg-forest px-5 py-2 text-sm font-medium text-sand disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Counts
              </button>
            </div>
          </div>
        )}

        {/* Recent counts */}
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-espresso">Last 7 Days</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-mocha">No counts submitted yet this week.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">On hand</th>
                    <th className="px-4 py-3 text-center">Par</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">By</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => {
                    const under = c.par_level != null && Number(c.counted_qty) < Number(c.par_level);
                    return (
                      <tr key={c.id} className="border-b border-latte/10 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-espresso">{c.item_name}</td>
                        <td className="px-4 py-2.5 text-center text-espresso">{c.counted_qty}</td>
                        <td className="px-4 py-2.5 text-center text-mocha">{c.par_level ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center">
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

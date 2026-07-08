"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Count = {
  id: string;
  count_date: string;
  status: string;
  total_variance_cents: number;
  total_expected_cents: number;
  total_counted_cents: number;
  counted_by: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CountHistoryPage() {
  const [counts, setCounts] = useState<Count[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/counts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load counts");
      setCounts(data.counts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load counts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCount() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create count");
      // Navigate to the new count sheet
      window.location.href = `/admin/inventory/counts/${data.count.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create count");
      setCreating(false);
    }
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/inventory" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <ClipboardList className="h-7 w-7 text-forest" />
            Inventory Count History
          </h1>
          <p className="text-sm text-mocha">Monthly par counts and variance reports</p>
        </div>
        <button onClick={createCount} disabled={creating} className="btn-primary text-sm">
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Start New Count
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-bronze/30 bg-bronze/10 p-3 text-sm text-espresso">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading counts...
        </div>
      ) : counts.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-mocha/40" />
          <p className="mt-4 text-mocha">No inventory counts yet.</p>
          <p className="mt-1 text-sm text-mocha/70">Start your first monthly count to track variance and cost of goods.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-latte/20 bg-cream text-left text-mocha">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Expected</th>
                <th className="px-4 py-3 text-center font-medium">Counted</th>
                <th className="px-4 py-3 text-center font-medium">Variance</th>
                <th className="px-4 py-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10">
              {counts.map((count) => {
                const variance = count.total_variance_cents;
                const isComplete = count.status === "completed";
                return (
                  <tr key={count.id} className="hover:bg-latte/5">
                    <td className="px-4 py-3">
                      <Link href={`/admin/inventory/counts/${count.id}`} className="font-medium text-forest hover:underline">
                        {new Date(count.count_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isComplete ? "bg-sage/20 text-sage" : "bg-bronze/15 text-espresso"}`}>
                        {count.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-mocha">{isComplete ? money(count.total_expected_cents) : "—"}</td>
                    <td className="px-4 py-3 text-center text-mocha">{isComplete ? money(count.total_counted_cents) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {isComplete ? (
                        <span className={`inline-flex items-center gap-1 font-medium ${variance < 0 ? "text-bronze" : "text-sage"}`}>
                          {variance < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                          {variance >= 0 ? "+" : ""}{money(variance)}
                        </span>
                      ) : (
                        <span className="text-mocha">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-mocha">
                      {count.completed_at ? new Date(count.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, DollarSign, Loader2, Search, Users } from "lucide-react";

type Affiliate = {
  id: string;
  name: string | null;
  email: string;
  code: string | null;
  total_referrals: number;
  pending_referrals: number;
  total_earned_cents: number;
  pending_payouts_cents: number;
  paid_payouts_cents: number;
};

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAffiliates() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/affiliates", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load affiliates");
        }

        if (!cancelled) {
          setAffiliates(Array.isArray(data.affiliates) ? data.affiliates : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load affiliates");
          setAffiliates([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAffiliates();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAffiliates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return affiliates;

    return affiliates.filter((affiliate) =>
      [affiliate.name, affiliate.email, affiliate.code]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [affiliates, searchTerm]);

  const totals = useMemo(() => {
    return affiliates.reduce(
      (acc, affiliate) => {
        acc.referrals += affiliate.total_referrals;
        acc.earned += affiliate.total_earned_cents;
        acc.pending += affiliate.pending_payouts_cents;
        return acc;
      },
      { referrals: 0, earned: 0, pending: 0 }
    );
  }, [affiliates]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-espresso flex items-center gap-3">
            <Users className="h-8 w-8 text-forest" /> Affiliates &amp; Referrals
          </h1>
          <p className="text-mocha mt-1">Live referral-code performance and payout readiness.</p>
        </div>
        <Link href="/admin" className="text-sm text-mocha hover:text-espresso">← Back to Admin</Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Affiliates</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{affiliates.length}</p>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Successful referrals</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{totals.referrals}</p>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Pending payouts</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{formatCurrency(totals.pending)}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-latte/20 bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search affiliates by name, email, or referral code..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-latte/20 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-latte/10 text-left text-sm font-medium text-mocha">
              <tr>
                <th className="py-4 px-6">Affiliate</th>
                <th className="py-4 px-6">Code</th>
                <th className="py-4 px-6 text-right">Completed</th>
                <th className="py-4 px-6 text-right">Pending</th>
                <th className="py-4 px-6 text-right">Earned</th>
                <th className="py-4 px-6 text-right">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10 text-sm">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-mocha">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" /> Loading live referral data...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-bronze">{error}</td>
                </tr>
              )}

              {!loading && !error && filteredAffiliates.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-mocha">
                    No referral affiliates found yet. Customer referral codes will appear here once generated.
                  </td>
                </tr>
              )}

              {!loading && !error && filteredAffiliates.map((affiliate) => (
                <tr key={affiliate.id} className="hover:bg-latte/5">
                  <td className="py-5 px-6">
                    <div className="font-medium text-espresso">{affiliate.name || affiliate.email}</div>
                    <div className="mt-0.5 text-xs text-mocha">{affiliate.email}</div>
                  </td>
                  <td className="py-5 px-6 font-mono text-espresso">{affiliate.code || "—"}</td>
                  <td className="py-5 px-6 text-right text-espresso">{affiliate.total_referrals}</td>
                  <td className="py-5 px-6 text-right text-mocha">{affiliate.pending_referrals}</td>
                  <td className="py-5 px-6 text-right font-medium text-espresso">
                    {formatCurrency(affiliate.total_earned_cents)}
                  </td>
                  <td className="py-5 px-6 text-right">
                    {affiliate.pending_payouts_cents > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-bronze/15 px-3 py-1 text-xs font-medium text-bronze">
                        <DollarSign className="mr-1 h-3 w-3" /> {formatCurrency(affiliate.pending_payouts_cents)} pending
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
                        Current
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-mocha">
        <Award className="h-4 w-4 text-forest" /> Tier bonuses auto-trigger at 5 / 10 / 25 successful referrals.
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Star, Crown, Zap, Coffee, ArrowLeft, Loader2, Gift } from "lucide-react";

interface BalanceData {
  email: string;
  points: number;
  tier: string;
  total_spent_cents: number;
  total_orders: number;
  next_tier: string | null;
  points_to_next_tier: number;
  transactions: Array<{
    points: number;
    type: string;
    description: string;
    created_at: string;
  }>;
}

const TIERS = [
  { name: "bronze", label: "Bronze", threshold: 0, icon: Star, color: "text-amber-700" },
  { name: "silver", label: "Silver", threshold: 500, icon: Zap, color: "text-slate-500" },
  { name: "gold", label: "Gold", threshold: 1500, icon: Crown, color: "text-yellow-600" },
  { name: "kynda-vip", label: "Kynda VIP", threshold: 3000, icon: Coffee, color: "text-forest" },
];

export default function AccountRewardsPage() {
  const supabase = createClient();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
  }, []);

  async function loadBalance() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/loyalty/balance?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-max max-w-2xl flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-forest" />
        </div>
      </section>
    );
  }

  const currentTier = TIERS.find((t) => t.name === (balance?.tier ?? "bronze")) ?? TIERS[0];
  const TierIcon = currentTier.icon;

  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">My Rewards</h1>
        <p className="mt-1 text-sm text-mocha">Track your points, tier, and redemption history</p>

        {/* Points Card */}
        <div className="mt-6 rounded-2xl border border-latte/20 bg-card p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-latte/20`}>
              <TierIcon className={`h-6 w-6 ${currentTier.color}`} />
            </div>
            <div>
              <p className="text-sm text-mocha">Current Tier</p>
              <p className="font-heading text-lg font-semibold text-espresso">{currentTier.label}</p>
            </div>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <span className="font-heading text-4xl font-bold text-espresso">{balance?.points ?? 0}</span>
            <span className="text-sm text-mocha mb-1">points</span>
          </div>

          {balance?.next_tier && balance.points_to_next_tier > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-mocha mb-1">
                <span>Progress to {balance.next_tier}</span>
                <span>{balance.points_to_next_tier} pts needed</span>
              </div>
              <div className="h-2 rounded-full bg-latte/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-forest transition-all"
                  style={{
                    width: `${Math.min(100, ((balance.points ?? 0) / ((balance.points ?? 0) + balance.points_to_next_tier)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-mocha">
            Earn 1 point per $1 spent · 100 points = $5.00 off · You&apos;ve spent ${((balance?.total_spent_cents ?? 0) / 100).toFixed(2)} across {balance?.total_orders ?? 0} orders
          </p>
        </div>

        {/* Redeem CTA */}
        <div className="mt-4 flex gap-3">
          <Link href="/shop" className="btn-primary flex-1 text-center py-3">
            Shop to Earn Points
          </Link>
          <Link href="/menu" className="btn-secondary flex-1 text-center py-3">
            Order for Pickup
          </Link>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold text-espresso">Recent Activity</h2>
          {(balance?.transactions?.length ?? 0) === 0 ? (
            <div className="mt-3 rounded-xl border border-latte/20 bg-card p-8 text-center">
              <Gift className="mx-auto h-8 w-8 text-latte" />
              <p className="mt-2 text-sm text-mocha">No activity yet. Start shopping to earn points!</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {balance?.transactions?.map((tx, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-latte/20 bg-card p-3">
                  <div>
                    <p className="text-sm text-espresso">{tx.description}</p>
                    <p className="text-xs text-mocha">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === "earned" || tx.type === "bonus" ? "text-forest" : "text-red-600"}`}>
                    {tx.type === "earned" || tx.type === "bonus" ? "+" : "-"}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

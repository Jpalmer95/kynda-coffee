"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Pause, Play, Search, User, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Subscription = {
  id: string;
  customer_name: string;
  customer_email: string;
  plan: string;
  frequency: "weekly" | "biweekly" | "monthly" | string;
  amount_cents: number;
  status: "active" | "paused" | "cancelled" | "past_due" | "trialing" | string;
  next_billing: string | null;
  started: string | null;
  stripe_subscription_id: string | null;
};

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusClassName = (status: string) => {
  switch (status) {
    case "active":
      return "bg-forest/10 text-forest";
    case "paused":
      return "bg-bronze/15 text-bronze";
    case "past_due":
      return "bg-red-100 text-red-700";
    case "trialing":
      return "bg-sage/20 text-sage";
    default:
      return "bg-latte/20 text-mocha";
  }
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function loadSubscriptions() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/subscriptions", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load subscriptions");
      }

      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return subscriptions;

    return subscriptions.filter((sub) =>
      [sub.customer_name, sub.customer_email, sub.plan, sub.status, sub.frequency]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [subscriptions, searchTerm]);

  const totals = useMemo(() => {
    return subscriptions.reduce(
      (acc, sub) => {
        if (sub.status === "active") acc.active += 1;
        if (sub.status === "paused") acc.paused += 1;
        if (sub.status === "past_due") acc.pastDue += 1;
        acc.monthlyValue += sub.status === "active" ? sub.amount_cents : 0;
        return acc;
      },
      { active: 0, paused: 0, pastDue: 0, monthlyValue: 0 }
    );
  }, [subscriptions]);

  const updateStatus = async (id: string, newStatus: Subscription["status"]) => {
    setSavingId(id);

    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update subscription");
      }

      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === id ? { ...sub, status: data.subscription?.status || newStatus } : sub
        )
      );
      toast(`Subscription ${newStatus}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update subscription", "error");
    } finally {
      setSavingId(null);
    }
  };

  const cancelSubscription = async (id: string) => {
    if (!confirm("Cancel this subscription in Kynda's subscription ledger?")) return;
    await updateStatus(id, "cancelled");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-espresso">Subscriptions</h1>
          <p className="text-sm text-mocha">Manage live recurring coffee deliveries from Supabase + Stripe webhook state.</p>
        </div>
        <Link href="/admin" className="text-sm text-mocha hover:text-espresso">← Back to Admin</Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Active</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{totals.active}</p>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Paused</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{totals.paused}</p>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Past due</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{totals.pastDue}</p>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-5">
          <p className="text-sm text-mocha">Active monthly value</p>
          <p className="mt-2 font-heading text-3xl font-bold text-espresso">{formatCurrency(totals.monthlyValue)}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-latte/20 bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search subscriptions by customer, plan, status, or frequency..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-latte/20 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-latte/10 text-left text-sm text-mocha">
              <tr>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Next Billing</th>
                <th className="px-6 py-4 font-medium w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10 text-sm">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-mocha">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" /> Loading live subscriptions...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-bronze">{error}</td>
                </tr>
              )}

              {!loading && !error && filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-mocha">
                    No subscriptions found. Live Coffee Club subscriptions will appear here after checkout/webhook creation.
                  </td>
                </tr>
              )}

              {!loading && !error && filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-latte/5">
                  <td className="px-6 py-4">
                    <div className="font-medium text-espresso flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-forest" /> {sub.customer_name}
                    </div>
                    <div className="text-xs text-mocha mt-0.5">{sub.customer_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-espresso">{sub.plan}</div>
                    {sub.stripe_subscription_id && (
                      <div className="mt-0.5 font-mono text-[11px] text-mocha">{sub.stripe_subscription_id}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {formatCurrency(sub.amount_cents)} <span className="text-xs text-mocha">/ {sub.frequency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${statusClassName(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-mocha">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {sub.next_billing ? new Date(sub.next_billing).toLocaleDateString() : "TBD"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {sub.status === "active" && (
                        <button
                          onClick={() => updateStatus(sub.id, "paused")}
                          disabled={savingId === sub.id}
                          className="rounded-lg p-2 text-mocha hover:bg-latte/15 disabled:opacity-40"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      {sub.status === "paused" && (
                        <button
                          onClick={() => updateStatus(sub.id, "active")}
                          disabled={savingId === sub.id}
                          className="rounded-lg p-2 text-mocha hover:bg-latte/15 disabled:opacity-40"
                          title="Resume"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {sub.status !== "cancelled" && (
                        <button
                          onClick={() => cancelSubscription(sub.id)}
                          disabled={savingId === sub.id}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

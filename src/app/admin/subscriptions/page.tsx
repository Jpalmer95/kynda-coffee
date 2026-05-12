"use client";

import { useState } from "react";
import Link from "next/link";
import { Pause, Play, X, Calendar, User } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Subscription = {
  id: string;
  customer_name: string;
  customer_email: string;
  plan: string;
  frequency: "weekly" | "monthly";
  amount_cents: number;
  status: "active" | "paused" | "canceled";
  next_billing: string;
  started: string;
};

const mockSubscriptions: Subscription[] = [
  {
    id: "sub_001",
    customer_name: "Elena Rodriguez",
    customer_email: "elena.r@personal.com",
    plan: "Weekly Coffee Box",
    frequency: "weekly",
    amount_cents: 1800,
    status: "active",
    next_billing: "2026-06-18",
    started: "2026-04-10",
  },
  {
    id: "sub_002",
    customer_name: "Marcus Thompson",
    customer_email: "marcus.t@work.net",
    plan: "Monthly Office Delivery",
    frequency: "monthly",
    amount_cents: 6500,
    status: "paused",
    next_billing: "2026-07-01",
    started: "2026-02-15",
  },
];

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateStatus = async (id: string, newStatus: Subscription["status"]) => {
    setLoading(true);
    // In production: call Supabase / Stripe to update subscription
    await new Promise(r => setTimeout(r, 400));

    setSubscriptions(prev =>
      prev.map(sub =>
        sub.id === id ? { ...sub, status: newStatus } : sub
      )
    );

    toast(`Subscription ${newStatus}`, "success");
    setLoading(false);
  };

  const cancelSubscription = async (id: string) => {
    if (!confirm("Cancel this subscription? Customer will receive a final email.")) return;
    await updateStatus(id, "canceled");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-espresso">Subscriptions</h1>
          <p className="text-sm text-mocha">Manage recurring coffee deliveries</p>
        </div>
        <Link href="/admin" className="text-sm text-mocha hover:text-espresso">← Back to Admin</Link>
      </div>

      <div className="rounded-2xl border border-latte/20 bg-white overflow-hidden">
        <table className="w-full">
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
            {subscriptions.map(sub => (
              <tr key={sub.id} className="hover:bg-latte/5">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-espresso flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> {sub.customer_name}
                    </div>
                    <div className="text-xs text-mocha mt-0.5">{sub.customer_email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-espresso">{sub.plan}</td>
                <td className="px-6 py-4">
                  ${(sub.amount_cents / 100).toFixed(2)} <span className="text-xs text-mocha">/ {sub.frequency}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block text-xs px-3 py-0.5 rounded-full ${
                    sub.status === "active" ? "bg-sage/20 text-sage" :
                    sub.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-mocha">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {sub.next_billing}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {sub.status === "active" && (
                      <button
                        onClick={() => updateStatus(sub.id, "paused")}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-latte/15 text-mocha"
                        title="Pause"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {sub.status === "paused" && (
                      <button
                        onClick={() => updateStatus(sub.id, "active")}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-latte/15 text-mocha"
                        title="Resume"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {sub.status !== "canceled" && (
                      <button
                        onClick={() => cancelSubscription(sub.id)}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
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

      {subscriptions.length === 0 && (
        <div className="text-center py-12 text-mocha">
          No active subscriptions yet.
        </div>
      )}
    </div>
  );
}

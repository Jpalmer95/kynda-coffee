"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, DollarSign, Award } from "lucide-react";

type Affiliate = {
  id: string;
  email: string;
  code: string;
  total_referrals: number;
  total_earned_cents: number;
  pending_payouts: number;
};

const mockAffiliates: Affiliate[] = [
  {
    id: "cust_1",
    email: "jordan@hey.com",
    code: "KYND-JORD-9K2P",
    total_referrals: 14,
    total_earned_cents: 14000,
    pending_payouts: 3000,
  },
  {
    id: "cust_2",
    email: "maya@work.co",
    code: "KYND-MAYA-4Q7Z",
    total_referrals: 7,
    total_earned_cents: 6500,
    pending_payouts: 0,
  },
];

export default function AdminAffiliates() {
  const [affiliates] = useState<Affiliate[]>(mockAffiliates);

  const payOut = (id: string) => {
    alert("Payout triggered (demo). In production this creates Stripe payout + marks rewarded.");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-espresso flex items-center gap-3">
            <Users className="h-8 w-8" /> Affiliates &amp; Referrals
          </h1>
          <p className="text-mocha mt-1">Track performance and issue rewards</p>
        </div>
        <Link href="/admin" className="text-sm text-mocha hover:underline">← Back to Admin</Link>
      </div>

      <div className="bg-white rounded-3xl border border-latte/30 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-latte/10 text-left text-sm font-medium text-mocha">
            <tr>
              <th className="py-4 px-6">Affiliate</th>
              <th className="py-4 px-6">Code</th>
              <th className="py-4 px-6 text-right">Referrals</th>
              <th className="py-4 px-6 text-right">Earned</th>
              <th className="py-4 px-6 text-right">Pending Payout</th>
              <th className="py-4 px-6 w-36">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {affiliates.map((a) => (
              <tr key={a.id} className="hover:bg-latte/5">
                <td className="py-5 px-6 font-medium text-espresso">{a.email}</td>
                <td className="py-5 px-6 font-mono text-espresso">{a.code}</td>
                <td className="py-5 px-6 text-right">{a.total_referrals}</td>
                <td className="py-5 px-6 text-right font-medium">
                  ${(a.total_earned_cents / 100).toFixed(2)}
                </td>
                <td className="py-5 px-6 text-right">
                  {a.pending_payouts > 0 ? (
                    <span className="text-amber-600 font-medium">${(a.pending_payouts / 100).toFixed(2)}</span>
                  ) : (
                    <span className="text-sage">Paid</span>
                  )}
                </td>
                <td className="py-5 px-6">
                  <button
                    onClick={() => payOut(a.id)}
                    disabled={a.pending_payouts === 0}
                    className="btn-accent text-xs px-4 py-1 disabled:opacity-40"
                  >
                    <DollarSign className="inline h-3 w-3 mr-1" /> Pay Out
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-mocha flex items-center gap-2">
        <Award className="h-4 w-4" /> Tier bonuses auto-trigger at 5 / 10 / 25 successful referrals.
      </div>
    </div>
  );
}

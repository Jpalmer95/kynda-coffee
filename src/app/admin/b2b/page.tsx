"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, TrendingUp } from "lucide-react";

type WholesaleAccount = {
  id: string;
  company: string;
  contact: string;
  email: string;
  tier: "Bronze" | "Silver" | "Gold";
  monthlySpend: number;
  lastOrder: string;
  notes: string;
};

const initialAccounts: WholesaleAccount[] = [
  {
    id: "b1",
    company: "Horseshoe Bay Resort",
    contact: "David Chen",
    email: "procurement@horseshoebay.com",
    tier: "Gold",
    monthlySpend: 1240,
    lastOrder: "May 5, 2026",
    notes: "Weekly delivery every Tuesday. Prefers 5lb bags of Ethiopian.",
  },
  {
    id: "b2",
    company: "Lakeway Corporate Center",
    contact: "Amanda Ruiz",
    email: "office@lakewaycorp.net",
    tier: "Silver",
    monthlySpend: 670,
    lastOrder: "April 28, 2026",
    notes: "",
  },
];

export default function AdminB2BPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedAccount, setSelectedAccount] = useState<WholesaleAccount | null>(null);
  const [newNote, setNewNote] = useState("");

  function updateNotes(accountId: string) {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, notes: newNote } : acc
      )
    );
    setNewNote("");
    setSelectedAccount(null);
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-forest" /> B2B &amp; Wholesale
          </h1>
          <p className="text-sm text-mocha">
            Corporate accounts • Bulk coffee subscriptions • Custom quotes
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Accounts List */}
        <div className="lg:col-span-2 space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => setSelectedAccount(account)}
              className="border border-latte/20 bg-white rounded-2xl p-6 cursor-pointer hover:border-bronze/30 transition-all"
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-xl text-espresso">{account.company}</div>
                  <div className="text-sm text-mocha">{account.contact} • {account.email}</div>
                </div>
                <div className="text-right">
                  <div className="inline px-3 py-1 rounded-full text-xs font-medium bg-surface text-white">
                    {account.tier}
                  </div>
                  <div className="font-mono text-lg mt-1">${account.monthlySpend} <span className="text-xs text-mocha">/mo</span></div>
                </div>
              </div>

              <div className="mt-4 text-sm">Last order: {account.lastOrder}</div>
            </div>
          ))}

          <button className="btn-secondary w-full py-3 mt-2">+ Add New Wholesale Account</button>
        </div>

        {/* Detail Sidebar */}
        <div className="border border-latte/20 bg-white rounded-2xl p-6 h-fit">
          {selectedAccount ? (
            <>
              <h3 className="font-semibold text-lg mb-1">{selectedAccount.company}</h3>
              <p className="text-sm text-mocha mb-6">{selectedAccount.contact} — {selectedAccount.email}</p>

              <div className="space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-mocha mb-1">Current Tier</div>
                  <div className="text-3xl font-semibold text-espresso">{selectedAccount.tier}</div>
                  <div className="text-xs text-mocha/70">12% volume discount applied</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Monthly volume</span>
                    <span className="font-mono">${selectedAccount.monthlySpend}</span>
                  </div>
                  <div className="h-2 bg-latte/30 rounded-full overflow-hidden">
                    <div className="h-full bg-rust w-[75%]" />
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-widest text-mocha mb-2">Account Notes</div>
                  <textarea
                    value={newNote || selectedAccount.notes}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="input-field w-full h-24 text-sm"
                  />
                  <button
                    onClick={() => updateNotes(selectedAccount.id)}
                    className="mt-3 btn-primary w-full text-sm"
                  >
                    Save Notes
                  </button>
                </div>

                <button className="flex items-center gap-2 text-sm text-espresso underline mt-2">
                  <FileText className="h-4 w-4" /> Request Custom Quote
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-mocha">
              <TrendingUp className="mx-auto h-8 w-8 mb-3 opacity-60" />
              Select a B2B account to manage pricing, quotes, and delivery notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

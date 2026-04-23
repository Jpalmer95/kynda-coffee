"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Search, ToggleLeft, ToggleRight, Loader2, DollarSign, Calendar, Mail } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface GiftCard {
  id: string;
  code: string;
  amount_cents: number;
  balance_cents: number;
  status: "active" | "redeemed" | "expired" | "cancelled";
  recipient_email?: string;
  message?: string;
  created_at: string;
  stripe_payment_intent_id?: string;
}

export default function GiftCardsPage() {
  const { toast } = useToast();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadCards = useCallback(async () => {
    const url = statusFilter === "all" ? "/api/admin/gift-cards" : `/api/admin/gift-cards?status=${statusFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setCards(data.gift_cards ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  async function toggleStatus(id: string, current: string) {
    const newStatus = current === "active" ? "cancelled" : "active";
    const res = await fetch("/api/admin/gift-cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      toast(`Gift card ${newStatus}`, "info");
      loadCards();
    }
  }

  const filtered = cards.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.recipient_email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: cards.length,
    active: cards.filter((c) => c.status === "active").length,
    redeemed: cards.filter((c) => c.status === "redeemed").length,
    totalValue: cards.reduce((sum, c) => sum + c.amount_cents, 0),
    remainingValue: cards.reduce((sum, c) => sum + c.balance_cents, 0),
  };

  const statusColors: Record<string, string> = {
    active: "bg-sage/20 text-sage",
    redeemed: "bg-latte/20 text-mocha",
    expired: "bg-amber-50 text-amber-600",
    cancelled: "bg-red-50 text-red-600",
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-espresso">Gift Cards</h1>
          <p className="text-sm text-mocha">{stats.total} total · {stats.active} active</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-latte/20 bg-white p-4">
          <p className="text-xs text-mocha uppercase tracking-wide">Total Value</p>
          <p className="mt-1 text-xl font-bold text-espresso">{formatPrice(stats.totalValue)}</p>
        </div>
        <div className="rounded-xl border border-latte/20 bg-white p-4">
          <p className="text-xs text-mocha uppercase tracking-wide">Remaining</p>
          <p className="mt-1 text-xl font-bold text-sage">{formatPrice(stats.remainingValue)}</p>
        </div>
        <div className="rounded-xl border border-latte/20 bg-white p-4">
          <p className="text-xs text-mocha uppercase tracking-wide">Active</p>
          <p className="mt-1 text-xl font-bold text-espresso">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-latte/20 bg-white p-4">
          <p className="text-xs text-mocha uppercase tracking-wide">Redeemed</p>
          <p className="mt-1 text-xl font-bold text-espresso">{stats.redeemed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or email..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-field w-full sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="redeemed">Redeemed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-latte/20 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream/50">
            <tr>
              <th className="px-4 py-3 font-medium text-espresso">Code</th>
              <th className="px-4 py-3 font-medium text-espresso">Amount</th>
              <th className="px-4 py-3 font-medium text-espresso">Balance</th>
              <th className="px-4 py-3 font-medium text-espresso">Recipient</th>
              <th className="px-4 py-3 font-medium text-espresso">Created</th>
              <th className="px-4 py-3 font-medium text-espresso">Status</th>
              <th className="px-4 py-3 font-medium text-espresso text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-rust" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-mocha">
                  No gift cards found
                </td>
              </tr>
            ) : (
              filtered.map((card) => (
                <tr key={card.id} className="hover:bg-cream/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-espresso">
                    <div className="flex items-center gap-2">
                      <Gift className="h-3.5 w-3.5 text-mocha" />
                      {card.code}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatPrice(card.amount_cents)}</td>
                  <td className="px-4 py-3">
                    <span className={card.balance_cents === 0 ? "text-mocha line-through" : "font-medium text-espresso"}>
                      {formatPrice(card.balance_cents)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mocha">
                    {card.recipient_email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {card.recipient_email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-mocha">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(card.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[card.status]}`}>
                      {card.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleStatus(card.id, card.status)}
                      className="inline-flex items-center gap-1"
                      aria-label={card.status === "active" ? "Deactivate" : "Activate"}
                    >
                      {card.status === "active" ? (
                        <ToggleRight className="h-5 w-5 text-sage" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-mocha" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

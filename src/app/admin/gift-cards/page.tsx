"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Plus, Search, Loader2, Trash2 } from "lucide-react";

type GiftCard = {
  id: string;
  code: string;
  amount_cents: number;
  balance_cents: number;
  recipient_email: string | null;
  message: string | null;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
};

export default function AdminGiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({ amount: 50, recipient_email: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gift-cards", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load gift cards");
      setCards(data.gift_cards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCards = cards.filter(
    (card) =>
      card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.recipient_email && card.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  async function createGiftCard() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: newCard.amount,
          recipient_email: newCard.recipient_email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setShowCreate(false);
      setNewCard({ amount: 50, recipient_email: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(card: GiftCard) {
    const nextStatus = card.status === "active" ? "cancelled" : "active";
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <Gift className="h-8 w-8 text-forest" /> Gift Cards
            </h1>
            <p className="text-sm text-mocha">Issue, track and manage digital gift cards</p>
          </div>
        </div>

        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Issue New Card
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <input
          type="text"
          placeholder="Search by code or recipient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10 w-full"
        />
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-mocha" />
      </div>

      {/* Cards Table */}
      <div className="border border-latte/20 rounded-2xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-latte/20">
            <tr className="text-left text-mocha">
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Recipient</th>
              <th className="px-6 py-4 font-medium">Balance</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Issued</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-mocha">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!loading && filteredCards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-mocha">No gift cards found.</td>
              </tr>
            )}
            {!loading && filteredCards.map((card) => (
              <tr key={card.id} className="hover:bg-latte/5">
                <td className="px-6 py-4 font-mono text-espresso font-medium">{card.code}</td>
                <td className="px-6 py-4 text-mocha">{card.recipient_email || "—"}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-espresso">${(card.balance_cents / 100).toFixed(2)}</span>
                  <span className="text-xs text-mocha ml-1">/ ${(card.amount_cents / 100).toFixed(2)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-0.5 text-xs font-medium rounded-full ${
                    card.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    card.status === "redeemed" ? "bg-latte/50 text-mocha" : "bg-red-100 text-red-600"
                  }`}>
                    {card.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-mocha">
                  {new Date(card.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleStatus(card)}
                    className="text-xs text-mocha hover:text-espresso underline"
                  >
                    {card.status === "active" ? "Cancel" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-xl mb-5 flex items-center gap-2">
              <Gift className="h-5 w-5 text-forest" /> Issue New Gift Card
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-mocha mb-1 block">Amount (USD)</label>
                <input
                  type="number"
                  min="1"
                  value={newCard.amount}
                  onChange={(e) => setNewCard({ ...newCard, amount: Number(e.target.value) })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm text-mocha mb-1 block">Recipient Email (optional)</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newCard.recipient_email}
                  onChange={(e) => setNewCard({ ...newCard, recipient_email: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 btn btn-secondary">Cancel</button>
              <button
                onClick={createGiftCard}
                disabled={creating}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Gift Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Plus, Search } from "lucide-react";

type GiftCard = {
  id: string;
  code: string;
  balance: number;
  originalAmount: number;
  status: "Active" | "Redeemed" | "Expired";
  issuedTo?: string;
  issuedDate: string;
  lastUsed?: string;
};

const initialCards: GiftCard[] = [
  {
    id: "gc1",
    code: "KYND-2026-AB12",
    balance: 48.50,
    originalAmount: 50,
    status: "Active",
    issuedTo: "Priya Patel",
    issuedDate: "May 8, 2026",
    lastUsed: "May 10",
  },
  {
    id: "gc2",
    code: "KYND-2026-CD34",
    balance: 0,
    originalAmount: 25,
    status: "Redeemed",
    issuedTo: "Marcus Thompson",
    issuedDate: "April 22, 2026",
    lastUsed: "May 3",
  },
  {
    id: "gc3",
    code: "KYND-2026-EF56",
    balance: 75,
    originalAmount: 100,
    status: "Active",
    issuedTo: "Elena Rodriguez",
    issuedDate: "May 5, 2026",
  },
];

export default function AdminGiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>(initialCards);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({ amount: 50, issuedTo: "" });

  const filteredCards = cards.filter(
    (card) =>
      card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.issuedTo && card.issuedTo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  function createGiftCard() {
    const code = `KYND-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const card: GiftCard = {
      id: `gc${Date.now()}`,
      code,
      balance: newCard.amount,
      originalAmount: newCard.amount,
      status: "Active",
      issuedTo: newCard.issuedTo || undefined,
      issuedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setCards((prev) => [card, ...prev]);
    setShowCreate(false);
    setNewCard({ amount: 50, issuedTo: "" });
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
      <div className="border border-latte/20 rounded-2xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-latte/20">
            <tr className="text-left text-mocha">
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Recipient</th>
              <th className="px-6 py-4 font-medium">Balance</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Issued</th>
              <th className="px-6 py-4 font-medium">Last Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {filteredCards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-mocha">No gift cards found.</td>
              </tr>
            )}
            {filteredCards.map((card) => (
              <tr key={card.id} className="hover:bg-latte/5">
                <td className="px-6 py-4 font-mono text-espresso font-medium">{card.code}</td>
                <td className="px-6 py-4 text-mocha">{card.issuedTo || "—"}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-espresso">${card.balance.toFixed(2)}</span>
                  <span className="text-xs text-mocha ml-1">/ ${card.originalAmount}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-0.5 text-xs font-medium rounded-full ${
                    card.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                    card.status === "Redeemed" ? "bg-latte/50 text-mocha" : "bg-red-100 text-red-600"
                  }`}>
                    {card.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-mocha">{card.issuedDate}</td>
                <td className="px-6 py-4 text-xs text-mocha">{card.lastUsed || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-xl mb-5 flex items-center gap-2">
              <Gift className="h-5 w-5 text-forest" /> Issue New Gift Card
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-mocha mb-1 block">Amount (USD)</label>
                <input
                  type="number"
                  value={newCard.amount}
                  onChange={(e) => setNewCard({ ...newCard, amount: Number(e.target.value) })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm text-mocha mb-1 block">Issued To (optional)</label>
                <input
                  type="text"
                  placeholder="Customer name or email"
                  value={newCard.issuedTo}
                  onChange={(e) => setNewCard({ ...newCard, issuedTo: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 btn btn-secondary">Cancel</button>
              <button onClick={createGiftCard} className="flex-1 btn-primary">Create Gift Card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

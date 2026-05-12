"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Star, MessageSquare, TrendingUp } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  points: number;
  tier: "Bronze" | "Silver" | "Gold";
  lifetimeValue: number;
  totalOrders: number;
  favoriteItems: string[];
  notes: string;
  lastVisit: string;
};

const initialCustomers: Customer[] = [
  {
    id: "c1",
    name: "Elena Rodriguez",
    email: "elena.r@personal.com",
    phone: "(830) 555-0142",
    points: 1240,
    tier: "Gold",
    lifetimeValue: 487.5,
    totalOrders: 38,
    favoriteItems: ["Ethiopian Guji", "Kynda Mug"],
    notes: "Prefers oat milk in lattes. Birthday June 14. Loves merch drops.",
    lastVisit: "2 days ago"
  },
  {
    id: "c2",
    name: "Marcus Thompson",
    email: "marcus.t@work.net",
    points: 680,
    tier: "Silver",
    lifetimeValue: 214.25,
    totalOrders: 19,
    favoriteItems: ["Honduras Finca Yaque"],
    notes: "",
    lastVisit: "1 week ago"
  },
  {
    id: "c3",
    name: "Priya Patel",
    email: "priya.p@gmail.com",
    phone: "(512) 555-9881",
    points: 315,
    tier: "Bronze",
    lifetimeValue: 89.0,
    totalOrders: 7,
    favoriteItems: ["Kynda Cap", "Americano Glass Mug"],
    notes: "Allergic to almonds. Orders for office every Friday.",
    lastVisit: "Yesterday"
  }
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function updateNotes(customerId: string) {
    setCustomers(prev =>
      prev.map(c =>
        c.id === customerId ? { ...c, notes: noteText } : c
      )
    );
    setActiveNote(null);
    setNoteText("");
  }

  function openNoteModal(customer: Customer) {
    setActiveNote(customer.id);
    setNoteText(customer.notes);
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-rust" /> Customers &amp; Loyalty
          </h1>
          <p className="text-sm text-mocha">
            {filteredCustomers.length} customers • Track LTV, preferences & loyalty points
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1"
        />
      </div>

      <div className="space-y-4">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="border border-latte/20 rounded-2xl bg-white p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Basic Info */}
              <div>
                <div className="font-semibold text-xl text-espresso">{customer.name}</div>
                <div className="text-sm text-mocha">{customer.email} {customer.phone && `• ${customer.phone}`}</div>
                <div className="text-xs text-mocha/70 mt-1">Last visit: {customer.lastVisit}</div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <div className="font-mono text-2xl font-semibold text-espresso">${customer.lifetimeValue}</div>
                  <div className="text-xs text-mocha tracking-wide">Lifetime Value</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-espresso">{customer.totalOrders}</div>
                  <div className="text-xs text-mocha tracking-wide">Orders</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-2xl font-semibold text-rust">{customer.points}</div>
                  <div className="text-xs text-mocha">Points</div>
                </div>
                <div className="px-4 py-1 rounded-full bg-surface text-white text-xs font-medium self-center">
                  {customer.tier}
                </div>
              </div>
            </div>

            {/* Favorites */}
            <div className="mt-4 text-sm">
              <span className="text-mocha">Favorites:</span>{" "}
              <span className="text-espresso">{customer.favoriteItems.join(" • ")}</span>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-mocha flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Staff Notes
                </span>
                <button 
                  className="text-rust text-xs hover:underline"
                  onClick={() => openNoteModal(customer)}
                >
                  Edit notes
                </button>
              </div>
              <div className="text-sm bg-cream border border-latte/30 rounded-xl px-4 py-3 text-espresso min-h-[56px]">
                {customer.notes || <span className="text-mocha/60 italic">No notes yet</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note Editing Modal */}
      {activeNote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Edit Customer Notes
            </h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full h-32 border border-latte/30 rounded-xl p-4 text-sm resize-y"
              placeholder="Add preferences, allergies, birthday, special instructions..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setActiveNote(null)} className="px-4 py-2 text-sm">Cancel</button>
              <button 
                onClick={() => updateNotes(activeNote)}
                className="btn-primary text-sm"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-mocha/70 mt-10">Loyalty points &amp; tiers will sync with Square transactions automatically in the next phase.</div>
    </div>
  );
}

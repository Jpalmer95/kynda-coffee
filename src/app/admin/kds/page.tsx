"use client";

import { useState } from "react";
import { ArrowLeft, Clock, User, Check } from "lucide-react";
import Link from "next/link";

type OrderItem = {
  name: string;
  qty: number;
  notes?: string;
};

type KDSOrder = {
  id: string;
  customer: string;
  time: string;
  status: "New" | "Preparing" | "Ready";
  items: OrderItem[];
  prepTime: number;
};

const initialOrders: KDSOrder[] = [
  {
    id: "ORD-1089",
    customer: "Elena R.",
    time: "09:42",
    status: "New",
    items: [
      { name: "Latte", qty: 2, notes: "Oat milk" },
      { name: "Ethiopian Pour Over", qty: 1 }
    ],
    prepTime: 6
  },
  {
    id: "ORD-1090",
    customer: "Walk-in",
    time: "09:45",
    status: "Preparing",
    items: [
      { name: "Cappuccino", qty: 1 },
      { name: "Americano", qty: 2, notes: "Double shot" }
    ],
    prepTime: 4
  },
  {
    id: "ORD-1091",
    customer: "Marcus T.",
    time: "09:51",
    status: "New",
    items: [
      { name: "Espresso", qty: 1 },
      { name: "Kynda Mug", qty: 1 }
    ],
    prepTime: 3
  }
];

export default function KDSPage() {
  const [orders, setOrders] = useState<KDSOrder[]>(initialOrders);

  function updateStatus(orderId: string, newStatus: KDSOrder["status"]) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  }

  const getStatusColor = (status: KDSOrder["status"]) => {
    if (status === "New") return "bg-red-600";
    if (status === "Preparing") return "bg-amber-600";
    return "bg-emerald-600";
  };

  return (
    <div className="min-h-screen bg-surface-800 text-sand p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-white/70 hover:text-white flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" /> Back
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Kitchen Display</h1>
              <p className="text-lg text-white/60">Real-time café orders • {orders.length} active</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white text-[#111] rounded-3xl p-6 shadow-xl flex flex-col h-full border-4 border-white"
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs tracking-[2px] text-black/60">ORDER {order.id}</div>
                  <div className="text-3xl font-bold flex items-center gap-2">
                    <User className="inline" /> {order.customer}
                  </div>
                </div>
                <div className={`${getStatusColor(order.status)} px-4 py-1 rounded-full text-white text-sm font-medium self-start`}>
                  {order.status}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-black/60 mb-6">
                <Clock className="h-4 w-4" /> {order.time} • ~{order.prepTime} min
              </div>

              {/* Items */}
              <div className="space-y-3 flex-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="border border-black/10 rounded-xl px-4 py-3">
                    <div className="font-semibold text-xl flex justify-between">
                      <span>{item.name}</span>
                      <span>x{item.qty}</span>
                    </div>
                    {item.notes && <div className="text-sm text-black/70 mt-1">— {item.notes}</div>}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-auto pt-6 border-t border-black/10 flex flex-col gap-2.5">
                {order.status === "New" && (
                  <button
                    onClick={() => updateStatus(order.id, "Preparing")}
                    className="w-full py-3.5 text-lg font-medium bg-amber-600 text-white rounded-2xl active:scale-[0.985]"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === "Preparing" && (
                  <button
                    onClick={() => updateStatus(order.id, "Ready")}
                    className="w-full py-3.5 text-lg font-medium bg-emerald-600 text-white rounded-2xl active:scale-[0.985]"
                  >
                    <div className="flex items-center justify-center gap-2"><Check className="h-5 w-5" /> Mark Ready</div>
                  </button>
                )}
                {order.status === "Ready" && (
                  <div className="text-emerald-600 font-semibold text-center py-2 text-lg">Order Complete ✓</div>
                )}

                <button
                  onClick={() => updateStatus(order.id, "New")}
                  className="text-xs underline text-black/70 active:opacity-60"
                >
                  Reset to New
                </button>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-20 text-white/60">
            No active orders. All quiet in the kitchen.
          </div>
        )}
      </div>
    </div>
  );
}

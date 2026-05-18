"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock, Loader2, RefreshCw, User } from "lucide-react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";

type KdsLineItem = {
  product_name?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  notes?: string;
  modifiers?: string[];
};

function statusLabel(status: OrderStatus) {
  if (status === "pending" || status === "confirmed") return "New";
  if (status === "processing") return "Preparing";
  if (status === "ready") return "Ready";
  return status;
}

function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "pending" || status === "confirmed") return "processing";
  if (status === "processing") return "ready";
  return null;
}

function statusColor(status: OrderStatus) {
  if (status === "pending" || status === "confirmed") return "bg-red-700 text-white";
  if (status === "processing") return "bg-bronze text-white";
  if (status === "ready") return "bg-sage text-white";
  return "bg-latte/20 text-espresso";
}

function minutesSince(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.round((Date.now() - created) / 60000));
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  async function loadOrders() {
    setError(null);
    try {
      const res = await fetch("/api/admin/kds", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load KDS orders");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KDS orders");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);
    try {
      const res = await fetch("/api/admin/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadOrders();
    const poll = setInterval(loadOrders, 15000);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  const sortedOrders = useMemo(() => orders, [orders]);

  return (
    <div className="min-h-screen bg-surface-800 p-4 font-mono text-sand md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sand/80 hover:text-sand">
              <ArrowLeft className="h-5 w-5" /> Back
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Kitchen Display</h1>
              <p className="text-lg text-sand/80">Real-time café orders • {orders.length} active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <button onClick={loadOrders} className="rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand hover:bg-sand/10">
              <RefreshCw className="mr-2 inline h-4 w-4" /> Refresh
            </button>
            <div className="text-2xl font-semibold">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-bronze/40 bg-bronze/20 p-4 text-sand">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sand/80">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading active orders...
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="rounded-3xl border border-sand/10 bg-sand/5 py-20 text-center text-sand/80">
            No active orders. All quiet in the kitchen.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedOrders.map((order) => {
              const next = nextStatus(order.status);
              const items = (order.items ?? []) as KdsLineItem[];
              return (
                <article key={order.id} className="flex h-full flex-col rounded-3xl border-4 border-sand bg-card p-6 text-espresso shadow-xl">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs tracking-[2px] text-mocha">ORDER {order.order_number}</div>
                      <div className="mt-1 flex items-center gap-2 text-3xl font-bold">
                        <User className="h-7 w-7" /> {order.email?.split("@")[0] || "Guest"}
                      </div>
                    </div>
                    <div className={`${statusColor(order.status)} self-start rounded-full px-4 py-1 text-sm font-medium`}>
                      {statusLabel(order.status)}
                    </div>
                  </div>

                  <div className="mb-6 flex items-center gap-2 text-sm text-mocha">
                    <Clock className="h-4 w-4" /> {minutesSince(order.created_at)} min ago • {order.source}
                  </div>

                  <div className="flex-1 space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="rounded-xl border border-latte/30 px-4 py-3">
                        <div className="flex justify-between gap-3 text-xl font-semibold">
                          <span>{item.product_name || item.name || "Item"}</span>
                          <span>x{item.quantity ?? item.qty ?? 1}</span>
                        </div>
                        {item.modifiers?.length ? <div className="mt-1 text-sm text-mocha">{item.modifiers.join(" • ")}</div> : null}
                        {item.notes ? <div className="mt-1 text-sm text-mocha">— {item.notes}</div> : null}
                      </div>
                    ))}
                    {order.notes && <div className="rounded-xl bg-cream p-3 text-sm text-mocha">Order note: {order.notes}</div>}
                  </div>

                  <div className="mt-auto flex flex-col gap-2.5 border-t border-latte/20 pt-6">
                    {next ? (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        disabled={updatingId === order.id}
                        className="w-full rounded-2xl bg-surface py-3.5 text-lg font-medium text-sand active:scale-[0.985] disabled:opacity-60"
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        ) : next === "ready" ? (
                          <span className="flex items-center justify-center gap-2"><Check className="h-5 w-5" /> Mark Ready</span>
                        ) : (
                          "Start Preparing"
                        )}
                      </button>
                    ) : (
                      <div className="py-2 text-center text-lg font-semibold text-sage">Ready for handoff ✓</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

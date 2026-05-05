"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Loader2, MonitorCheck, Phone, RefreshCw, User, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getKdsNextActions, type KdsOrderLike, type KdsAction } from "@/lib/orders/kds";
import type { OrderItem, OrderStatus } from "@/types";

interface KdsOrder extends KdsOrderLike {
  email: string;
  notes?: string | null;
  payment_preference?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  updated_at: string;
  items: Array<OrderItem & {
    provider?: string;
    provider_item_id?: string;
    provider_variation_id?: string;
    modifiers?: Array<{
      name: string;
      price_cents: number;
      provider_modifier_id?: string;
      provider_modifier_list_id?: string;
    }>;
    notes?: string;
  }>;
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  confirmed: "bg-sky-100 text-sky-900 border-sky-200",
  processing: "bg-indigo-100 text-indigo-900 border-indigo-200",
  shipped: "bg-sage/20 text-sage border-sage/30",
  delivered: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-red-100 text-red-900 border-red-200",
  refunded: "bg-mocha/10 text-mocha border-mocha/20",
};

function actionClass(action: KdsAction) {
  if (action.tone === "danger") return "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
  if (action.tone === "primary") return "bg-espresso text-cream hover:bg-espresso/90";
  return "border border-latte bg-white text-espresso hover:bg-latte/20";
}

function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function contextLabel(order: KdsOrder) {
  const meta = order.fulfillment_metadata ?? {};
  const mode = String(meta.mode ?? order.order_channel ?? "qr");
  const label = String(meta.label ?? "").trim();
  if (mode === "table") return `Table ${label || "?"}`;
  if (mode === "parking") return `Parking ${label || "?"}`;
  if (mode === "pickup") return "To-go pickup";
  if (mode === "lobby") return "Lobby";
  return mode.toUpperCase();
}

function modifierSummary(item: KdsOrder["items"][number]) {
  return (item.modifiers ?? [])
    .map((modifier) => `${modifier.name}${modifier.price_cents ? ` +${formatPrice(modifier.price_cents)}` : ""}`)
    .join(" · ");
}

export default function AdminKdsPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const counts = useMemo(() => ({
    pending: orders.filter((order) => order.status === "pending").length,
    confirmed: orders.filter((order) => order.status === "confirmed").length,
    processing: orders.filter((order) => order.status === "processing").length,
  }), [orders]);

  const loadOrders = useCallback(async (quiet = false) => {
    setError("");
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch("/api/admin/kds", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load KDS orders.");
      setOrders(data.orders ?? []);
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KDS orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const timer = window.setInterval(() => loadOrders(true), 15000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  async function updateStatus(order: KdsOrder, status: OrderStatus) {
    setUpdatingId(order.id);
    setError("");
    try {
      const response = await fetch("/api/admin/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update order.");
      await loadOrders(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <MonitorCheck className="h-6 w-6 text-rust" />
                <h1 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">Kitchen Display / QR Queue</h1>
              </div>
              <p className="mt-1 text-sm text-mocha">
                Live active QR, lobby, table, parking, and pickup orders. Auto-refreshes every 15 seconds.
              </p>
            </div>
          </div>
          <button onClick={() => loadOrders(true)} disabled={refreshing} className="btn-secondary flex items-center justify-center text-sm disabled:opacity-60">
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">New</p>
            <p className="mt-1 font-heading text-3xl font-bold text-amber-900">{counts.pending}</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Accepted</p>
            <p className="mt-1 font-heading text-3xl font-bold text-sky-900">{counts.confirmed}</p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">In progress</p>
            <p className="mt-1 font-heading text-3xl font-bold text-indigo-900">{counts.processing}</p>
          </div>
        </div>

        {lastLoadedAt && <p className="mb-4 text-xs text-mocha/70">Last loaded {lastLoadedAt.toLocaleTimeString()}</p>}
        {error && <p className="mb-4 rounded-xl bg-rust/10 p-3 text-sm text-rust">{error}</p>}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-white" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-latte/20 bg-white py-16 text-center">
            <XCircle className="mx-auto h-12 w-12 text-latte" />
            <h2 className="mt-4 font-heading text-2xl font-bold text-espresso">No active QR orders</h2>
            <p className="mt-2 text-mocha">New table/lobby/parking orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => {
              const actions = getKdsNextActions(order.status);
              const meta = order.fulfillment_metadata ?? {};
              const age = minutesSince(order.created_at);
              return (
                <article key={order.id} className="flex min-h-[26rem] flex-col rounded-3xl border border-latte/20 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-rust">{contextLabel(order)}</p>
                      <h2 className="mt-1 font-heading text-2xl font-bold text-espresso">{order.order_number}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 rounded-2xl bg-cream/70 p-3 text-sm text-mocha">
                    <div className="flex items-center gap-2"><User className="h-4 w-4" />{String(meta.customer_name ?? "Guest")}</div>
                    {meta.customer_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{String(meta.customer_phone)}</div>}
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{age} min ago · {new Date(order.created_at).toLocaleTimeString()}</div>
                    <div className="text-xs uppercase tracking-wider text-mocha/70">{order.payment_preference || meta.payment_preference || "pay_at_counter"}</div>
                  </div>

                  <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                    {order.items.map((item, index) => (
                      <div key={`${item.product_id}-${index}`} className="rounded-2xl border border-latte/20 p-3">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold text-espresso">{item.quantity}× {item.product_name}</p>
                            {item.variant_name && <p className="text-sm text-mocha">{item.variant_name}</p>}
                          </div>
                          <span className="font-semibold text-espresso">{formatPrice(item.total_cents)}</span>
                        </div>
                        {modifierSummary(item) && <p className="mt-2 text-xs text-mocha">{modifierSummary(item)}</p>}
                        {item.notes && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">Note: {item.notes}</p>}
                      </div>
                    ))}
                  </div>

                  {order.notes && <p className="mt-4 rounded-xl bg-rust/10 p-3 text-sm text-rust">Order note: {order.notes}</p>}

                  <div className="mt-4 flex items-center justify-between border-t border-latte/20 pt-4">
                    <span className="text-sm text-mocha">Total</span>
                    <span className="font-heading text-2xl font-bold text-espresso">{formatPrice(order.total_cents)}</span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order, action.status)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${actionClass(action)}`}
                      >
                        {updatingId === order.id ? "Updating..." : action.label}
                      </button>
                    ))}
                    <Link href={`/admin/orders/${order.id}`} className="rounded-xl border border-latte px-3 py-2 text-center text-sm font-semibold text-mocha hover:bg-latte/20">
                      Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

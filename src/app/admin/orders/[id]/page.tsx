"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, CreditCard, Phone, MapPin, Banknote } from "lucide-react";

// Items arrive in two shapes: the shop checkout shape (price_cents) and the
// POS/QR/agent shape (unit_price_cents/total_cents + modifiers). Normalize.
interface OrderItemRaw {
  product_name: string;
  quantity: number;
  price_cents?: number;
  unit_price_cents?: number;
  total_cents?: number;
  variant?: { size?: string; grind?: string; color?: string };
  variant_name?: string;
  modifiers?: { name: string; price_cents: number }[];
}

interface Order {
  id: string;
  order_number?: string;
  email: string;
  status: string;
  source?: string;
  order_channel?: string;
  payment_status?: string;
  payment_method?: string;
  paid_at?: string;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address?: Record<string, string>;
  fulfillment_metadata?: {
    mode?: string;
    label?: string;
    customer_name?: string;
    customer_phone?: string;
    vehicle?: string;
    table?: string;
    [key: string]: unknown;
  } | null;
  notes?: string;
  items: OrderItemRaw[];
  stripe_session_id?: string;
  created_at: string;
  updated_at: string;
}

function itemLineTotal(item: OrderItemRaw): number {
  if (typeof item.total_cents === "number") return item.total_cents;
  const unit = item.unit_price_cents ?? item.price_cents ?? 0;
  const mods = (item.modifiers ?? []).reduce((s, m) => s + (m.price_cents || 0), 0);
  return (unit + mods) * (item.quantity || 1);
}

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string; bg: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "text-teal-700", bg: "bg-teal-50" },
  processing: { label: "Processing", icon: Package, color: "text-blue-700", bg: "bg-blue-50" },
  ready: { label: "Ready", icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50" },
  complete: { label: "Complete", icon: CheckCircle, color: "text-green-700", bg: "bg-green-50" },
  fulfilled: { label: "Fulfilled", icon: CheckCircle, color: "text-green-700", bg: "bg-green-50" },
  shipped: { label: "Shipped", icon: Truck, color: "text-purple-700", bg: "bg-purple-50" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "text-green-700", bg: "bg-green-50" },
  cancelled: { label: "Cancelled", icon: Clock, color: "text-red-700", bg: "bg-red-50" },
  refunded: { label: "Refunded", icon: Banknote, color: "text-red-700", bg: "bg-red-50" },
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d.order ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.order) setOrder(data.order);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-section">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-latte/20" />
          <div className="h-48 rounded-xl bg-latte/20" />
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="admin-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-2xl font-bold text-espresso">Order Not Found</h1>
          <p className="mt-2 text-mocha">This order does not exist.</p>
          <Link href="/admin/orders" className="btn-primary mt-6 inline-flex">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </div>
      </section>
    );
  }

  const status = statusConfig[order.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;
  const fm = order.fulfillment_metadata ?? {};
  const channel = order.order_channel || order.source || "web";
  const paid = order.payment_status === "paid";

  return (
    <section className="admin-section">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 rounded-lg text-sm text-mocha transition-colors hover:text-espresso"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-xs text-mocha">{new Date(order.created_at).toLocaleString()}</span>
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Order #{(order.order_number || order.id.slice(0, 8)).toUpperCase()}
        </h1>

        {/* Status + payment + channel badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${status.bg} ${status.color}`}>
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            {paid
              ? `Paid${order.payment_method ? ` · ${order.payment_method}` : ""}`
              : `Unpaid${order.payment_status ? ` (${order.payment_status})` : ""}`}
          </div>
          <span className="inline-flex items-center rounded-full bg-latte/20 px-3 py-1.5 text-xs font-medium capitalize text-mocha">
            {channel}
            {fm.mode && fm.mode !== channel ? ` · ${fm.mode}` : ""}
          </span>
        </div>

        {/* Status Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {["pending", "processing", "ready", "complete", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={updating || order.status === s}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                order.status === s
                  ? "border-surface bg-surface text-sand"
                  : "border-latte bg-card text-mocha hover:border-surface"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Customer Info */}
        <div className="mt-6 rounded-xl border border-latte/20 bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-espresso">Customer</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {fm.customer_name && (
              <p className="text-mocha"><span className="font-medium text-espresso">Name:</span> {String(fm.customer_name)}</p>
            )}
            <p className="text-mocha"><span className="font-medium text-espresso">Email:</span> {order.email}</p>
            {fm.customer_phone && (
              <p className="flex items-center gap-1.5 text-mocha">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${fm.customer_phone}`} className="hover:text-espresso">{String(fm.customer_phone)}</a>
              </p>
            )}
            {fm.vehicle && (
              <p className="text-mocha"><span className="font-medium text-espresso">Vehicle:</span> {String(fm.vehicle)}</p>
            )}
            {fm.table && (
              <p className="text-mocha"><span className="font-medium text-espresso">Table:</span> {String(fm.table)}</p>
            )}
            {order.shipping_address && (
              <div className="text-mocha">
                <span className="flex items-center gap-1.5 font-medium text-espresso"><MapPin className="h-3.5 w-3.5" /> Shipping:</span>
                <p className="mt-1 whitespace-pre-line">
                  {Object.entries(order.shipping_address)
                    .filter(([, v]) => v)
                    .map(([, v]) => v)
                    .join("\n")}
                </p>
              </div>
            )}
            {order.notes && (
              <p className="text-mocha"><span className="font-medium text-espresso">Notes:</span> {order.notes}</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="mt-4 rounded-xl border border-latte/20 bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-espresso">Items</h2>
          <div className="mt-3 divide-y divide-latte/10">
            {order.items.map((item, i) => {
              const unit = item.unit_price_cents ?? item.price_cents ?? 0;
              return (
                <div key={i} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-espresso">
                      {item.product_name}
                      {item.variant_name && item.variant_name !== "Regular" && (
                        <span className="ml-1.5 text-xs font-normal text-mocha">({item.variant_name})</span>
                      )}
                    </p>
                    <p className="text-xs text-mocha">
                      Qty: {item.quantity} × {formatPrice(unit)}
                      {item.variant?.size && ` · Size: ${item.variant.size}`}
                      {item.variant?.grind && ` · Grind: ${item.variant.grind}`}
                      {item.variant?.color && ` · Color: ${item.variant.color}`}
                    </p>
                    {(item.modifiers ?? []).length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-mocha">
                        {item.modifiers!.map((m, j) => (
                          <li key={j}>
                            + {m.name}
                            {m.price_cents > 0 && ` (${formatPrice(m.price_cents)})`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-espresso">
                    {formatPrice(itemLineTotal(item))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 rounded-xl border border-latte/20 bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-espresso">Summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-mocha">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between text-mocha">
              <span>Tax</span>
              <span>{formatPrice(order.tax_cents)}</span>
            </div>
            <div className="flex justify-between text-mocha">
              <span>Shipping</span>
              <span>{order.shipping_cents === 0 ? "Free" : formatPrice(order.shipping_cents)}</span>
            </div>
            <div className="flex justify-between border-t border-latte/20 pt-2 text-base font-semibold text-espresso">
              <span>Total</span>
              <span>{formatPrice(order.total_cents)}</span>
            </div>
          </div>

          {order.paid_at && (
            <p className="mt-3 text-xs text-mocha">Paid at {new Date(order.paid_at).toLocaleString()}</p>
          )}
          {order.stripe_session_id && (
            <div className="mt-2 flex items-center gap-2 text-xs text-mocha">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Stripe Session: {order.stripe_session_id}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

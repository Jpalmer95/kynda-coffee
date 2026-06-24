"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  Monitor,
  Package,
  Search,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toCsv, downloadCsv } from "@/lib/export/csv";
import type { OrderStatus } from "@/types";

type RangePreset = "today" | "7d" | "30d" | "custom";

interface HistoryOrder {
  id: string;
  order_number: string;
  email: string;
  status: string;
  source: string;
  items: unknown[];
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  notes: string | null;
  fulfillment_metadata: Record<string, unknown> | null;
  order_channel: string | null;
  payment_status: string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  processing: "bg-indigo-100 text-indigo-800",
  ready: "bg-cyan-100 text-cyan-800",
  shipped: "bg-sage/20 text-sage",
  complete: "bg-green-100 text-green-800",
  fulfilled: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-mocha/10 text-mocha",
};

const ALL_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "processing", "ready", "complete", "fulfilled", "delivered", "cancelled", "refunded", "shipped",
];

const SOURCE_LABELS: Record<string, string> = {
  "qr": "QR Order",
  "website": "Online Shop",
  "square-pos": "Square POS",
  "agent": "Agent",
  "kynda-qr-order": "QR Order",
  "kynda-website": "Online Shop",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function customerName(o: HistoryOrder): string {
  const meta = o.fulfillment_metadata as Record<string, unknown> | null;
  const name = meta?.customer_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (o.email && !o.email.startsWith("square:")) return o.email.split("@")[0];
  return "Guest";
}

function itemCount(o: HistoryOrder): number {
  if (!Array.isArray(o.items)) return 0;
  const items = o.items as Array<Record<string, unknown>>;
  return items.reduce<number>((sum, it) => {
    const q = it?.quantity;
    return sum + (typeof q === "number" ? q : 1);
  }, 0);
}

function itemSummary(o: HistoryOrder): string {
  if (!Array.isArray(o.items) || o.items.length === 0) return "—";
  const items = o.items as Array<Record<string, unknown>>;
  return items
    .map((item) => {
      const qty = typeof item.quantity === "number" ? item.quantity : 1;
      const name = (item.product_name as string) || (item.name as string) || "Item";
      return `${qty > 1 ? `${qty}x ` : ""}${name}`;
    })
    .join(", ");
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<RangePreset>("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const buildQuery = useCallback((): string => {
    const params = new URLSearchParams();
    params.set("range", range);
    if (range === "custom") {
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59, 999);
        params.set("to", t.toISOString());
      }
    }
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    return params.toString();
  }, [range, fromDate, toDate, statusFilter, sourceFilter]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/history?${buildQuery()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load order history");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order history");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      customerName(o).toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered
    .filter((o) => o.payment_status === "paid" || o.source === "square-pos")
    .reduce((sum, o) => sum + o.total_cents, 0);

  const handleExport = () => {
    const rows = filtered.map((o) => ({
      order_number: o.order_number,
      customer: customerName(o),
      email: o.email,
      status: o.status,
      source: sourceLabel(o.source),
      items: itemSummary(o),
      total: (o.total_cents / 100).toFixed(2),
      paid: o.payment_status ?? "",
      created: new Date(o.created_at).toLocaleString(),
    }));
    const csv = toCsv(rows);
    downloadCsv(`kynda-order-history-${range}.csv`, csv);
  };

  return (
    <section className="min-h-screen bg-surface-800 p-4 font-mono text-sand md:p-6">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sand/80 hover:text-sand">
              <ArrowLeft className="h-5 w-5" /> Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Order History</h1>
              <p className="text-sm text-sand/70">
                {filtered.length} order{filtered.length === 1 ? "" : "s"} · Revenue: {formatPrice(totalRevenue)}
              </p>
            </div>
            <Link
              href="/admin/kds"
              className="flex items-center gap-2 rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand/80 hover:bg-sand/10"
            >
              <Monitor className="h-4 w-4" />
              KDS Board →
            </Link>
          </div>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand hover:bg-sand/10 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Date Range + Filters */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-sand/15 bg-sand/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-sand/60" />
            <span className="text-sm font-semibold text-sand/80">Date Range:</span>
            {(["today", "7d", "30d", "custom"] as RangePreset[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-sand text-surface-800"
                    : "border border-sand/20 text-sand hover:bg-sand/10"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "Past 7 Days" : r === "30d" ? "Past 30 Days" : "Custom Range"}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-sand/80">
                From:
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-sand/20 bg-surface-900 px-3 py-1.5 text-sm text-sand focus:border-sand/50 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-sand/80">
                To:
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-sand/20 bg-surface-900 px-3 py-1.5 text-sm text-sand focus:border-sand/50 focus:outline-none"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-sand/20 bg-surface-900 px-3 py-1.5 text-sm text-sand focus:border-sand/50 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-sand/20 bg-surface-900 px-3 py-1.5 text-sm text-sand focus:border-sand/50 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="qr">QR Order</option>
              <option value="website">Online Shop</option>
              <option value="square-pos">Square POS</option>
              <option value="agent">Agent</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand/60" />
              <input
                type="text"
                placeholder="Search order #, email, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-sand/20 bg-surface-900 py-1.5 pl-9 pr-3 text-sm text-sand placeholder:text-sand/40 focus:border-sand/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-bronze/40 bg-bronze/20 p-4 text-sand">{error}</div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sand/80">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading order history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-sand/10 bg-sand/5 py-20 text-center text-sand/80">
            <Package className="mx-auto mb-3 h-12 w-12 text-sand/40" />
            <p className="text-lg">No orders found in this range.</p>
            <p className="text-sm text-sand/60">Try a different date range or filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table header (desktop) */}
            <div className="hidden lg:grid lg:grid-cols-[120px_1fr_1fr_100px_120px_100px_120px] gap-3 rounded-xl bg-sand/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sand/70">
              <span>Order #</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Total</span>
              <span>Source</span>
              <span>Status</span>
              <span>Placed</span>
            </div>

            {filtered.map((order) => {
              const meta = order.fulfillment_metadata as Record<string, unknown> | null;
              const extSource = meta?.external_source as string | undefined;
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-sand/10 bg-sand/5 p-3 transition-colors hover:bg-sand/10"
                >
                  {/* Desktop layout */}
                  <div className="hidden lg:grid lg:grid-cols-[120px_1fr_1fr_100px_120px_100px_120px] gap-3 items-center text-sm">
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-sand hover:text-white">
                      {order.order_number}
                    </Link>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sand">{customerName(order)}</div>
                      <div className="truncate text-xs text-sand/50">{order.email}</div>
                    </div>
                    <div className="truncate text-xs text-sand/70" title={itemSummary(order)}>
                      {itemCount(order)} item{itemCount(order) === 1 ? "" : "s"}: {itemSummary(order).slice(0, 60)}
                      {itemSummary(order).length > 60 ? "..." : ""}
                    </div>
                    <span className="font-semibold text-sand">{formatPrice(order.total_cents)}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-sand/80">{sourceLabel(order.source)}</span>
                      {extSource && <span className="text-[10px] text-sand/50">{extSource}</span>}
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-800"}`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-sand/60">
                      {new Date(order.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      {" "}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Mobile/tablet layout */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-sand hover:text-white">
                        {order.order_number}
                      </Link>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-800"}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-sand">{customerName(order)}</div>
                    <div className="mt-0.5 text-xs text-sand/60">
                      {itemCount(order)} items · {formatPrice(order.total_cents)} · {sourceLabel(order.source)}
                      {extSource ? ` · ${extSource}` : ""}
                    </div>
                    <div className="mt-0.5 text-xs text-sand/50">
                      {new Date(order.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

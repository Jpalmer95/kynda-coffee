"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Search, Filter, ChevronDown, ExternalLink, Download } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toCsv, downloadCsv } from "@/lib/export/csv";
import type { Order, OrderStatus } from "@/types";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-sage/20 text-sage",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-mocha/10 text-mocha",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest">("newest");

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders
    .filter((o) => {
      const matchesSearch =
        !search ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return b.total_cents - a.total_cents;
    });

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
                Orders
              </h1>
              <p className="text-sm text-mocha">
                {orders.length} total orders
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              const res = await fetch("/api/admin/export/orders");
              const data = await res.json();
              if (data.rows) {
                const csv = toCsv(data.rows);
                downloadCsv("kynda-orders.csv", csv);
              }
            }}
            className="btn-secondary text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by order # or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
              className="select-field text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="select-field text-sm"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest $</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-latte/20 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-latte/20" />
                  <div className="h-4 w-16 rounded bg-latte/20" />
                </div>
                <div className="mt-3 h-3 w-48 rounded bg-latte/20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-latte/20 bg-white py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg text-mocha">No orders found</p>
            <p className="text-sm text-mocha/60">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 rounded-xl bg-espresso px-4 py-3 text-xs font-medium uppercase tracking-wider text-cream">
              <span>Order</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Total</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>

            {filtered.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-latte/20 bg-white p-4 transition-shadow hover:shadow-md"
              >
                {/* Mobile layout */}
                <div className="flex flex-col gap-2 sm:hidden">
                  <div className="flex items-center justify-between">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-espresso hover:text-rust">
                      {order.order_number}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-mocha">{order.email}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mocha">{order.items.length} items</span>
                    <span className="font-semibold text-espresso">{formatPrice(order.total_cents)}</span>
                  </div>
                  <p className="text-xs text-mocha/60">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="mt-1 text-sm font-medium text-rust hover:underline"
                  >
                    View Details →
                  </Link>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-espresso hover:text-rust">
                    {order.order_number}
                  </Link>
                  <span className="text-sm text-mocha truncate">{order.email}</span>
                  <span className="text-sm text-mocha">{order.items.length} items</span>
                  <span className="font-semibold text-espresso">{formatPrice(order.total_cents)}</span>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
                    aria-label={`View order ${order.order_number}`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

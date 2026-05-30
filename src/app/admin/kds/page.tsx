"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock, Loader2, RefreshCw, Search, User, Car } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { Order, OrderStatus } from "@/types";
import type { KdsOrderLike } from "@/lib/orders/kds";
import {
  KDS_BOARDS,
  type KdsBoard,
  filterOrdersForBoard,
  fulfillmentTag,
  timerTier,
  TIMER_TIER_CLASS,
  minutesSince,
  computeKdsStats,
  kdsStatusLabel,
} from "@/lib/orders/kds-board";

type KdsLineItem = {
  product_name?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  notes?: string;
  modifiers?: string[];
};

/** KDS orders carry the canonical Order fields plus the KDS-specific metadata. */
type KdsOrder = Order & KdsOrderLike;

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

function KDSContent() {
  const searchParams = useSearchParams();
  const initialBoard = (searchParams.get("board") as KdsBoard) || "all";

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [board, setBoard] = useState<KdsBoard>(initialBoard);
  const [query, setQuery] = useState("");

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
    const poll = setInterval(loadOrders, 10000);
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  // Keep the board in sync if the URL param changes (e.g. a tablet bookmark).
  useEffect(() => {
    const b = (searchParams.get("board") as KdsBoard) || "all";
    setBoard(b);
  }, [searchParams]);

  const visibleOrders = useMemo(
    () => filterOrdersForBoard(orders, board, query),
    [orders, board, query]
  );

  const stats = useMemo(
    () => computeKdsStats(visibleOrders, now.getTime()),
    [visibleOrders, now]
  );

  // Per-board counts for the tab badges (board filter ignores search).
  const boardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of KDS_BOARDS) {
      counts[b.key] = filterOrdersForBoard(orders, b.key).length;
    }
    return counts;
  }, [orders]);

  return (
    <div className="min-h-screen bg-surface-800 p-4 font-mono text-sand md:p-6">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sand/80 hover:text-sand">
              <ArrowLeft className="h-5 w-5" /> Back
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kitchen Display</h1>
              <p className="text-sand/80">
                {KDS_BOARDS.find((b) => b.key === board)?.label ?? "All Orders"} • {visibleOrders.length} active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadOrders} className="rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand hover:bg-sand/10">
              <RefreshCw className="mr-2 inline h-4 w-4" /> Refresh
            </button>
            <div className="text-2xl font-semibold">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="In Queue" value={stats.total} />
          <StatCard label="Avg Wait" value={`${stats.avgWaitMinutes}m`} />
          <StatCard label="Longest" value={`${stats.longestWaitMinutes}m`} tone={stats.longestWaitMinutes >= 15 ? "late" : undefined} />
          <StatCard label="Fresh" value={stats.fresh} tone="fresh" />
          <StatCard label="Aging" value={stats.warm} tone="warm" />
          <StatCard label="Late" value={stats.late} tone="late" />
        </div>

        {/* Board tabs + search */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {KDS_BOARDS.map((b) => (
              <button
                key={b.key}
                onClick={() => setBoard(b.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                  board === b.key ? "bg-sand text-surface-800" : "border border-sand/20 text-sand hover:bg-sand/10"
                }`}
              >
                {b.label}
                <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs">{boardCounts[b.key] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand/60" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, #, vehicle, item..."
              className="w-full rounded-2xl border border-sand/20 bg-surface-900 py-2.5 pl-9 pr-3 text-sm text-sand placeholder:text-sand/40 focus:border-sand/50 focus:outline-none"
            />
          </div>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-bronze/40 bg-bronze/20 p-4 text-sand">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sand/80">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading active orders...
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-3xl border border-sand/10 bg-sand/5 py-20 text-center text-sand/80">
            {query ? "No orders match your search." : "No active orders on this board. All quiet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleOrders.map((order) => {
              const next = nextStatus(order.status);
              const items = ((order.items ?? []) as KdsLineItem[]);
              const tag = fulfillmentTag(order);
              const mins = minutesSince(order.created_at, now.getTime());
              const tier = timerTier(mins);
              const customerName =
                order.fulfillment_metadata?.customer_name ||
                order.email?.split("@")[0] ||
                "Guest";

              return (
                <article key={order.id} className="flex h-full flex-col rounded-3xl border-4 border-sand bg-card p-5 text-espresso shadow-xl">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs tracking-[2px] text-mocha">ORDER {order.order_number}</div>
                      <div className="mt-1 flex items-center gap-2 text-2xl font-bold">
                        <User className="h-6 w-6 shrink-0" /> <span className="truncate">{String(customerName)}</span>
                      </div>
                    </div>
                    <div className={`${statusColor(order.status)} self-start rounded-full px-3 py-1 text-xs font-medium`}>
                      {kdsStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Fulfillment tag + timer */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${tag.className}`}>
                      {tag.label}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${TIMER_TIER_CLASS[tier]}`}>
                      <Clock className="mr-1 inline h-3 w-3" />{mins}m
                    </span>
                  </div>

                  {/* Curbside vehicle / pickup spot callout */}
                  {tag.mode === "parking" && tag.detail && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                      <Car className="h-4 w-4 shrink-0" /> {tag.detail}
                    </div>
                  )}

                  <div className="flex-1 space-y-2.5">
                    {items.map((item, index) => (
                      <div key={index} className="rounded-xl border border-latte/30 px-3 py-2.5">
                        <div className="flex justify-between gap-3 text-lg font-semibold">
                          <span>{item.product_name || item.name || "Item"}</span>
                          <span>x{item.quantity ?? item.qty ?? 1}</span>
                        </div>
                        {item.modifiers?.length ? <div className="mt-1 text-sm text-mocha">{item.modifiers.join(" • ")}</div> : null}
                        {item.notes ? <div className="mt-1 text-sm text-mocha">— {item.notes}</div> : null}
                      </div>
                    ))}
                    {order.notes && <div className="rounded-xl bg-cream p-3 text-sm text-mocha">Note: {order.notes}</div>}
                  </div>

                  <div className="mt-auto flex flex-col gap-2.5 border-t border-latte/20 pt-5">
                    {next ? (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        disabled={updatingId === order.id}
                        className="w-full rounded-2xl bg-surface py-3 text-lg font-medium text-sand active:scale-[0.985] disabled:opacity-60"
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

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "fresh" | "warm" | "late" }) {
  const toneClass =
    tone === "late" ? "text-red-400" : tone === "warm" ? "text-amber-400" : tone === "fresh" ? "text-emerald-400" : "text-sand";
  return (
    <div className="rounded-2xl border border-sand/15 bg-sand/5 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-sand/60">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function KDSPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-800 p-8 text-sand">Loading KDS…</div>}>
      <KDSContent />
    </Suspense>
  );
}

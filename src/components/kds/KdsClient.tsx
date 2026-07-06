"use client";

/**
 * Shared Kitchen Display System client (Roadmap V2 — Epic 3).
 *
 * Used by BOTH:
 *  - /kds        → dedicated full-screen surface for kitchen iPads (no site chrome)
 *  - /admin/kds  → same board inside the admin portal
 *
 * Real-time: subscribes to Supabase Realtime `orders` INSERT/UPDATE (migration
 * 027 adds the table to the publication + team-member read RLS) and falls back
 * to 30s polling so a dropped websocket can never silently hide orders.
 *
 * New-order alert: audible chime (WebAudio — no asset to load) + on-screen
 * flash. iPads require a user gesture before audio can play, so the sound
 * toggle doubles as the audio unlock; preference persists per device.
 *
 * Unacknowledged orders (pending/confirmed, non-POS) repeat the alert every
 * 2 minutes until staff starts the order (→ processing = acknowledged) or
 * snoozes it (per-order or global, 5-minute intervals). A Screen Wake Lock
 * keeps the kitchen tablet awake so alerts never miss due to sleep.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  History as HistoryIcon,
  Loader2,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  User,
  Car,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Order, OrderStatus } from "@/types";
import type { KdsOrderLike } from "@/lib/orders/kds";
import { createClient } from "@/lib/supabase/client";
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
  normalizeKdsItems,
  sourceBadge,
  deliveryPlatformBadge,
  paymentChip,
  placedAtLabel,
} from "@/lib/orders/kds-board";
import {
  detectNewKdsOrders,
  shouldPlayKdsNotificationSound,
  kdsNewOrderMessage,
  isPosOrder,
} from "@/lib/orders/kds-notifications";

/** KDS orders carry the canonical Order fields plus the KDS-specific metadata. */
type KdsOrder = Order & KdsOrderLike;

const SOUND_PREF_KEY = "kynda-kds-sound";
const POLL_FALLBACK_MS = 30_000;
const REPEAT_ALERT_MS = 120_000; // 2 minutes between repeated alerts
const SNOOZE_MS = 300_000; // 5 minutes

/** The forward "bump" action for each active status. */
function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "pending" || status === "confirmed") return "processing";
  if (status === "processing") return "ready";
  if (status === "ready") return "complete"; // handoff: Picked Up / Delivered
  return null;
}

function nextActionLabel(status: OrderStatus): string {
  if (status === "pending" || status === "confirmed") return "Start Preparing";
  if (status === "processing") return "Mark Ready";
  return "Picked Up";
}

/** Long tickets collapse beyond this many line items (tap to expand). */
const TICKET_COLLAPSE_AT = 5;

function statusColor(status: OrderStatus) {
  if (status === "pending" || status === "confirmed") return "bg-red-700 text-white";
  if (status === "processing") return "bg-bronze text-white";
  if (status === "ready") return "bg-sage text-white";
  return "bg-latte/20 text-espresso";
}

/** Single two-tone "ding-ding" — used for the toggle confirmation. */
function playChime(ctx: AudioContext) {
  const play = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.05);
  };
  play(880, 0, 0.35);
  play(1174.66, 0.18, 0.45); // D6 — rising "ding-ding"
}

/**
 * Sustained new-order alert: repeats the two-tone chime 4 times with a
 * short gap between each burst, totalling ~4 seconds. This ensures the
 * kitchen team has enough time to hear the alert even when busy or across
 * the room. Only used for incoming non-POS orders (POS orders are filtered
 * out by detectNewKdsOrders before we ever get here).
 */
function playNewOrderAlert(ctx: AudioContext) {
  const play = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.05);
  };
  // 4 bursts of the rising two-tone chime, 0.5s apart.
  // Each burst: 0.63s (0.35 + 0.18 + 0.45 overlap).
  // Total: 4 * 0.63 + 3 * 0.5 ≈ 4.02s — comfortably in the 3-5s target.
  const burstGap = 0.5;
  const burstDuration = 0.63;
  for (let i = 0; i < 4; i++) {
    const offset = i * (burstDuration + burstGap);
    play(880, offset, 0.35);
    play(1174.66, offset + 0.18, 0.45); // D6
  }
}

export function KdsClient({ backHref }: { backHref?: string }) {
  const searchParams = useSearchParams();
  const initialBoard = (searchParams.get("board") as KdsBoard) || "all";

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [completed, setCompleted] = useState<KdsOrder[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCompleted, setExpandedCompleted] = useState<Set<string>>(new Set());
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [board, setBoard] = useState<KdsBoard>(initialBoard);
  const [query, setQuery] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [live, setLive] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  // Unacknowledged orders = pending/confirmed (not yet started). The alert
  // repeats every 2 min until staff starts the order or snoozes all alerts.
  const [unacknowledgedIds, setUnacknowledgedIds] = useState<Set<string>>(new Set());
  // Global snooze: when set, suppresses all alerts until this timestamp
  const [globalSnoozeUntil, setGlobalSnoozeUntil] = useState<number | null>(null);
  // Date scope: "today" (default) hides stale tickets from previous days;
  // "all" reveals them so they can be cleared.
  const [dateScope, setDateScope] = useState<"today" | "all">("today");

  const prevOrdersRef = useRef<KdsOrder[] | null>(null);
  const soundOnRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null); // WakeLockSentinel (not in TS DOM libs)
  // Ref mirroring global snooze for use in callbacks/intervals that would
  // otherwise capture stale closures.
  const globalSnoozeUntilRef = useRef<number | null>(null);

  const handleIncomingOrders = useCallback((next: KdsOrder[]) => {
    const { newOrders } = detectNewKdsOrders({
      previousOrders: prevOrdersRef.current,
      nextOrders: next,
    });
    prevOrdersRef.current = next;
    setOrders(next);

    // Track unacknowledged orders: pending/confirmed AND non-POS.
    // Once an order moves to processing/ready/complete it's acknowledged
    // and should stop repeating the alert.
    const stillUnacknowledged = new Set<string>();
    for (const order of next) {
      if ((order.status === "pending" || order.status === "confirmed") && !isPosOrder(order)) {
        stillUnacknowledged.add(order.id);
      }
    }
    setUnacknowledgedIds(stillUnacknowledged);

    if (newOrders.length > 0) {
      // Play the alert for genuinely new orders (not repeats)
      if (
        shouldPlayKdsNotificationSound({
          alertsEnabled: soundOnRef.current,
          newOrderCount: newOrders.length,
        }) &&
        audioCtxRef.current
      ) {
        // Check global snooze
        const nowMs = Date.now();
        const globallySnoozed = globalSnoozeUntilRef.current !== null && globalSnoozeUntilRef.current > nowMs;
        if (!globallySnoozed) {
          try {
            playNewOrderAlert(audioCtxRef.current);
          } catch {
            /* audio is best-effort */
          }
        }
      }
      setAnnouncement(kdsNewOrderMessage(newOrders));
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
      announceTimerRef.current = setTimeout(() => setAnnouncement(null), 8000);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/kds?scope=${dateScope}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load KDS orders");
      handleIncomingOrders(data.orders ?? []);
      setCompleted(data.completed ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KDS orders");
    } finally {
      setLoading(false);
    }
  }, [handleIncomingOrders, dateScope]);

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

  // Restore the per-device sound preference (audio still needs a tap to unlock).
  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_PREF_KEY) === "on") {
        setSoundOn(true);
        soundOnRef.current = true;
      }
    } catch {
      /* private mode */
    }
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    try {
      localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
    } catch {
      /* private mode */
    }
    if (next) {
      // The toggle tap is our user gesture — unlock/resume the AudioContext now.
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      audioCtxRef.current.resume().then(() => {
        if (audioCtxRef.current) playChime(audioCtxRef.current); // audible confirmation
      });
    }
  }

  // Initial load + polling fallback + wall clock.
  useEffect(() => {
    loadOrders();
    const poll = setInterval(loadOrders, POLL_FALLBACK_MS);
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    };
  }, [loadOrders]);

  // Supabase Realtime: refetch on any orders change (insert = new order, update = status moves).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kds-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders();
        }
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // Keep the board in sync if the URL param changes (e.g. a tablet bookmark).
  useEffect(() => {
    const b = (searchParams.get("board") as KdsBoard) || "all";
    setBoard(b);
  }, [searchParams]);

  // ─── Repeating alert for unacknowledged orders ──────────────────────────
  // Every 2 minutes, if there are unacknowledged (pending/confirmed) non-POS
  // orders that haven't been snoozed, replay the alert sound. This handles
  // the case where staff are away from the tablet or too busy to hear the
  // first alert. The cycle stops automatically once orders move to
  // "processing" (Start Preparing = acknowledged) because they're removed
  // from unacknowledgedIds by handleIncomingOrders.
  useEffect(() => {
    const tick = () => {
      if (!soundOnRef.current || !audioCtxRef.current) return;
      if (unacknowledgedIds.size === 0) return;

      const nowMs = Date.now();

      // Global snooze?
      if (globalSnoozeUntilRef.current !== null && globalSnoozeUntilRef.current > nowMs) return;

      try {
        playNewOrderAlert(audioCtxRef.current);
      } catch {
        /* audio is best-effort */
      }
      // Update the announcement banner to draw attention back
      const orderNums = [...unacknowledgedIds]
        .map((id) => orders.find((o) => o.id === id)?.order_number)
        .filter(Boolean);
      if (orderNums.length > 0) {
        setAnnouncement(
          orderNums.length === 1
            ? `⏰ Reminder: order ${orderNums[0]} still waiting — start or snooze it.`
            : `⏰ ${orderNums.length} orders still waiting: ${orderNums.join(", ")}.`
        );
        if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
        announceTimerRef.current = setTimeout(() => setAnnouncement(null), 10000);
      }
    };

    repeatTimerRef.current = setInterval(tick, REPEAT_ALERT_MS);
    return () => {
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    };
  }, [unacknowledgedIds, orders]);

  // ─── Snooze all alerts for 5 minutes ─────────────────────────────────────
  const snoozeAll = useCallback(() => {
    const expiry = Date.now() + SNOOZE_MS;
    globalSnoozeUntilRef.current = expiry;
    setGlobalSnoozeUntil(expiry);
    setAnnouncement(`🔕 Alerts snoozed for 5 minutes (until ${new Date(expiry).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}).`);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncement(null), 6000);
  }, []);

  // ─── Clean up expired global snooze periodically ───────────────────────────
  useEffect(() => {
    const cleanup = setInterval(() => {
      const nowMs = Date.now();
      if (globalSnoozeUntilRef.current !== null && globalSnoozeUntilRef.current <= nowMs) {
        globalSnoozeUntilRef.current = null;
        setGlobalSnoozeUntil(null);
      }
    }, 30_000);
    return () => clearInterval(cleanup);
  }, []);

  // ─── Screen Wake Lock: keep the kitchen tablet awake ─────────────────────
  // A kitchen tablet that dims/sleeps won't fire alerts. Request a wake lock
  // when sound alerts are enabled (which requires a user gesture — the toggle
  // tap — so the gesture requirement for wake lock is satisfied too).
  // Re-acquire on visibilitychange (wake locks are released when tab is
  // backgrounded or screen turns off).
  useEffect(() => {
    if (!soundOn) return;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        /* wake lock is best-effort — older browsers / iOS don't support it */
      }
    };

    requestWakeLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && soundOnRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [soundOn]);

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
            {backHref && (
              <Link href={backHref} className="flex items-center gap-2 text-sand/80 hover:text-sand">
                <ArrowLeft className="h-5 w-5" /> Back
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kitchen Display</h1>
              <p className="text-sand/80">
                {KDS_BOARDS.find((b) => b.key === board)?.label ?? "All Orders"} • {visibleOrders.length} active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live connection state */}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                live ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
              }`}
              title={live ? "Realtime connected — orders appear instantly" : "Realtime reconnecting — polling every 30s"}
            >
              {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {live ? "LIVE" : "POLLING"}
            </span>
            {/* Date scope toggle: Today (default) vs All Days (reveals stale tickets) */}
            <button
              onClick={() => setDateScope((s) => (s === "today" ? "all" : "today"))}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition-colors ${
                dateScope === "all"
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                  : "border-sand/20 text-sand hover:bg-sand/10"
              }`}
              title={
                dateScope === "today"
                  ? "Showing today's tickets only — tap to include previous days"
                  : "Showing all days (stale tickets included) — tap to show today only"
              }
              aria-pressed={dateScope === "all"}
            >
              <CalendarDays className="h-4 w-4" />
              {dateScope === "today" ? "Today" : "All Days"}
            </button>
            {/* Sound alerts toggle (also unlocks iPad audio) */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition-colors ${
                soundOn
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                  : "border-sand/20 text-sand hover:bg-sand/10"
              }`}
              aria-pressed={soundOn}
            >
              {soundOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {soundOn ? "Alerts On" : "Alerts Off"}
            </button>
            <button onClick={loadOrders} className="rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand hover:bg-sand/10">
              <RefreshCw className="mr-2 inline h-4 w-4" /> Refresh
            </button>
            <div className="text-2xl font-semibold">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        {/* New-order banner + screen-reader announcement */}
        <div aria-live="assertive" role="status">
          {announcement && (
            <div className="mb-4 animate-pulse rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 px-5 py-3 text-lg font-bold text-emerald-300">
              🔔 {announcement}
            </div>
          )}
        </div>

        {/* Persistent unacknowledged alert — stays until staff starts or snoozes. */}
        {unacknowledgedIds.size > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-amber-400/60 bg-amber-500/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 animate-pulse text-amber-400" />
              <span className="text-lg font-bold text-amber-300">
                {unacknowledgedIds.size} order{unacknowledgedIds.size !== 1 ? "s" : ""} waiting to be started
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={snoozeAll}
                className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/30 active:scale-[0.98]"
              >
                <BellOff className="h-4 w-4" /> Snooze All 5 min
              </button>
            </div>
          </div>
        )}

        {/* Global snooze indicator */}
        {globalSnoozeUntil !== null && globalSnoozeUntil > Date.now() && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-500/40 bg-slate-700/30 px-5 py-3 text-sm font-medium text-slate-300">
            <BellOff className="h-4 w-4" /> Alerts snoozed until{" "}
            {new Date(globalSnoozeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            <button
              onClick={() => {
                globalSnoozeUntilRef.current = null;
                setGlobalSnoozeUntil(null);
              }}
              className="ml-2 underline hover:text-slate-100"
            >
              Resume now
            </button>
          </div>
        )}

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
              const items = normalizeKdsItems(order.items);
              const tag = fulfillmentTag(order);
              const badge = sourceBadge(order);
              const pay = paymentChip(order);
              const mins = minutesSince(order.created_at, now.getTime());
              const tier = timerTier(mins);
              const placedAt = placedAtLabel(order.created_at);
              const customerName =
                order.fulfillment_metadata?.customer_name ||
                order.email?.split("@")[0] ||
                "Guest";
              const customerPhone = order.fulfillment_metadata?.customer_phone;
              const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
              const isUnacknowledged = unacknowledgedIds.has(order.id);

              return (
                <article
                  key={order.id}
                  className={`flex h-full flex-col rounded-3xl border-4 bg-card p-5 text-espresso shadow-xl ${
                    isUnacknowledged
                      ? "border-amber-400 animate-pulse shadow-amber-400/20"
                      : "border-sand"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs tracking-[2px] text-mocha">
                        ORDER {order.order_number}
                        {placedAt ? <span className="ml-2 normal-case tracking-normal">• {placedAt}</span> : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-2xl font-bold">
                        <User className="h-6 w-6 shrink-0" /> <span className="truncate">{String(customerName)}</span>
                      </div>
                      {typeof customerPhone === "string" && customerPhone.trim() ? (
                        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-mocha">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {customerPhone}
                        </div>
                      ) : null}
                    </div>
                    <div className={`${statusColor(order.status)} self-start rounded-full px-3 py-1 text-xs font-medium`}>
                      {kdsStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Channel + fulfillment + payment + timer chips */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${tag.className}`}>
                      {tag.label}
                    </span>
                    {pay ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${pay.className}`}>
                        {pay.label}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${TIMER_TIER_CLASS[tier]}`}>
                      <Clock className="mr-1 inline h-3 w-3" />{mins}m
                    </span>
                  </div>

                  {/* Curbside vehicle / pickup spot callout */}
                  {(tag.mode === "parking" || tag.mode === "pickup") && tag.detail && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                      <Car className="h-4 w-4 shrink-0" /> {tag.detail}
                    </div>
                  )}

                  {/* Delivery partner callout — show which courier to match */}
                  {tag.mode === "delivery" && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
                      <Car className="h-4 w-4 shrink-0" />
                      {(() => {
                        const dp = deliveryPlatformBadge(order);
                        return dp ? dp.label : "Delivery";
                      })()}
                      {tag.detail ? ` · ${tag.detail}` : ""}
                    </div>
                  )}

                  <div className="flex-1 space-y-2.5">
                    {(expandedTickets.has(order.id) ? items : items.slice(0, TICKET_COLLAPSE_AT)).map((item, index) => (
                      <div key={index} className="rounded-xl border border-latte/30 px-3 py-2.5">
                        <div className="flex justify-between gap-3 text-lg font-semibold">
                          <span>
                            {item.name}
                            {item.variant ? <span className="ml-1.5 text-base font-medium text-mocha">({item.variant})</span> : null}
                          </span>
                          <span className={item.quantity > 1 ? "rounded-lg bg-espresso px-2 text-cream" : ""}>x{item.quantity}</span>
                        </div>
                        {item.modifiers.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.modifiers.map((mod, mi) => (
                              <li key={mi} className="text-sm font-medium text-espresso/90">+ {mod}</li>
                            ))}
                          </ul>
                        )}
                        {item.notes ? <div className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">✎ {item.notes}</div> : null}
                      </div>
                    ))}
                    {items.length > TICKET_COLLAPSE_AT && (
                      <button
                        onClick={() =>
                          setExpandedTickets((prev) => {
                            const next = new Set(prev);
                            if (next.has(order.id)) next.delete(order.id);
                            else next.add(order.id);
                            return next;
                          })
                        }
                        className="w-full rounded-xl border-2 border-dashed border-latte/50 py-2 text-sm font-bold text-mocha active:scale-[0.985]"
                      >
                        {expandedTickets.has(order.id)
                          ? "▲ Collapse"
                          : `▼ Show ${items.length - TICKET_COLLAPSE_AT} more item${items.length - TICKET_COLLAPSE_AT === 1 ? "" : "s"}`}
                      </button>
                    )}
                    {order.notes && <div className="rounded-xl bg-cream p-3 text-sm font-semibold text-mocha">Note: {order.notes}</div>}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-mocha">
                    <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
                    <span className="font-semibold">${(order.total_cents / 100).toFixed(2)}</span>
                  </div>

                  <div className="mt-auto flex flex-col gap-2.5 border-t border-latte/20 pt-4">
                    {next ? (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        disabled={updatingId === order.id}
                        className="w-full rounded-2xl bg-surface py-3 text-lg font-medium text-sand active:scale-[0.985] disabled:opacity-60"
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        ) : next === "ready" || next === "complete" ? (
                          <span className="flex items-center justify-center gap-2"><Check className="h-5 w-5" /> {nextActionLabel(order.status)}</span>
                        ) : (
                          nextActionLabel(order.status)
                        )}
                      </button>
                    ) : (
                      <div className="py-2 text-center text-lg font-semibold text-sage">Ready for handoff ✓</div>
                    )}
                    {/* Undo an accidental Ready bump */}
                    {order.status === "ready" && (
                      <button
                        onClick={() => updateStatus(order.id, "processing")}
                        disabled={updatingId === order.id}
                        className="w-full rounded-2xl border border-latte/40 py-2 text-sm font-medium text-mocha active:scale-[0.985] disabled:opacity-60"
                      >
                        <RotateCcw className="mr-1.5 inline h-4 w-4" /> Back to Preparing
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Recently Completed rail — recover an accidental "Picked Up" tap */}
        <div className="mt-8 border-t border-sand/15 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand/80 hover:bg-sand/10"
              aria-expanded={showCompleted}
            >
              <HistoryIcon className="h-4 w-4" />
              Recently Completed ({completed.length})
              <span className="text-xs text-sand/50">{showCompleted ? "▲ hide" : "▼ show"}</span>
            </button>
            <Link
              href="/admin/orders/history"
              className="flex items-center gap-2 rounded-2xl border border-sand/20 px-4 py-2 text-sm text-sand/80 hover:bg-sand/10"
            >
              <HistoryIcon className="h-4 w-4" />
              Full Order History →
            </Link>
          </div>
          {showCompleted && (
            completed.length === 0 ? (
              <p className="mt-3 text-sm text-sand/60">No orders completed in the last 48 hours.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {completed.map((order) => {
                  const items = normalizeKdsItems(order.items);
                  const badge = sourceBadge(order);
                  const tag = fulfillmentTag(order);
                  const pay = paymentChip(order);
                  const summary = items
                    .map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}`)
                    .join(", ");
                  const customerName =
                    order.fulfillment_metadata?.customer_name ||
                    order.email?.split("@")[0] ||
                    "Guest";
                  const customerPhone = order.fulfillment_metadata?.customer_phone;
                  const isExpanded = expandedCompleted.has(order.id);
                  return (
                    <div key={order.id} className="rounded-2xl border border-sand/15 bg-sand/5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs tracking-wide text-sand/60">
                            {order.order_number} • {placedAtLabel(order.created_at)}
                          </div>
                          <div className="truncate text-base font-semibold text-sand">{String(customerName)}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-sand/70">{summary}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Expand / collapse toggle */}
                      <button
                        onClick={() =>
                          setExpandedCompleted((prev) => {
                            const next = new Set(prev);
                            if (next.has(order.id)) next.delete(order.id);
                            else next.add(order.id);
                            return next;
                          })
                        }
                        className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-medium text-sand/60 hover:text-sand"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Hide details</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> View details</>
                        )}
                      </button>

                      {/* Expanded order details */}
                      {isExpanded && (
                        <div className="mt-2 space-y-2 border-t border-sand/15 pt-3">
                          {/* Fulfillment + payment chips */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}>
                              {tag.label}
                            </span>
                            {pay && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pay.className}`}>
                                {pay.label}
                              </span>
                            )}
                          </div>

                          {/* Customer phone */}
                          {typeof customerPhone === "string" && customerPhone.trim() && (
                            <div className="flex items-center gap-1.5 text-xs text-sand/70">
                              <Phone className="h-3 w-3 shrink-0" /> {customerPhone}
                            </div>
                          )}

                          {/* Line items */}
                          <div className="space-y-1.5">
                            {items.map((item, i) => (
                              <div key={i} className="rounded-lg border border-sand/10 px-2.5 py-1.5">
                                <div className="flex justify-between gap-2 text-sm font-semibold text-sand">
                                  <span>
                                    {item.name}
                                    {item.variant && <span className="ml-1 text-xs font-normal text-sand/60">({item.variant})</span>}
                                  </span>
                                  <span className={item.quantity > 1 ? "rounded bg-sand/20 px-1.5 text-xs" : ""}>x{item.quantity}</span>
                                </div>
                                {item.modifiers.length > 0 && (
                                  <ul className="mt-0.5 space-y-0.5">
                                    {item.modifiers.map((mod, mi) => (
                                      <li key={mi} className="text-xs text-sand/60">+ {mod}</li>
                                    ))}
                                  </ul>
                                )}
                                {item.notes && (
                                  <div className="mt-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-300">✎ {item.notes}</div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Total + notes */}
                          <div className="flex items-center justify-between border-t border-sand/10 pt-2 text-xs text-sand/70">
                            <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
                            <span className="font-semibold text-sand">${(order.total_cents / 100).toFixed(2)}</span>
                          </div>
                          {order.notes && (
                            <div className="rounded-lg bg-sand/10 px-2.5 py-1.5 text-xs text-sand/70">
                              <span className="font-semibold text-sand">Note:</span> {order.notes}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => updateStatus(order.id, "ready")}
                        disabled={updatingId === order.id}
                        className="mt-3 w-full rounded-xl border border-sand/30 py-2 text-sm font-medium text-sand hover:bg-sand/10 active:scale-[0.985] disabled:opacity-60"
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        ) : (
                          <span><RotateCcw className="mr-1.5 inline h-4 w-4" /> Bring Back to Board</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
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

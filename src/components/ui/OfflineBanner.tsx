"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { WifiOff, Wifi, Cloud, RefreshCw, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const DISMISS_KEY = "kynda-offline-banner-dismissed";
const DISMISS_DURATION_MS = 60 * 60 * 1000; // 1 hour
const DEBOUNCE_MS = 3000; // Only show banner if offline for 3s+ continuous

/**
 * Offline / syncing status banner.
 *
 * Hard rules to prevent false positives (navigator.onLine is unreliable):
 *   1. Never shows on initial page load — waits DEBOUNCE_MS before showing.
 *      This gives the SW connectivity probe time to verify actual status.
 *   2. Can be dismissed for 1 hour via X button (persists to localStorage).
 *      Prevents re-spamming across page navigations.
 *   3. Only shows genuine offline state — connectivity probe (in useOfflineSync)
 *      verifies via actual /api/health fetch before trusting navigator.onLine.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount, syncing, syncQueue } = useOfflineSync();
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const [debouncedOffline, setDebouncedOffline] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load dismiss state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const ts = parseInt(stored, 10);
      if (ts > Date.now()) {
        setDismissedUntil(ts);
      } else {
        window.localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);

  // Only show banner after being offline for 3+ seconds continuously.
  // If navigator.onLine flickers false→true quickly, we never show.
  useEffect(() => {
    if (isOnline) {
      // Back online — clear any pending debounce timer, hide immediately
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      setDebouncedOffline(false);
      return;
    }

    // Not online — start (or keep running) a debounce timer
    if (!debounceTimer.current) {
      debounceTimer.current = setTimeout(() => {
        setDebouncedOffline(true);
        debounceTimer.current = null;
      }, DEBOUNCE_MS);
    }

    return () => {
      // Don't clear on unmount — let the timer fire if component briefly re-mounts
    };
  }, [isOnline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, []);

  function dismiss() {
    const until = Date.now() + DISMISS_DURATION_MS;
    setDismissedUntil(until);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      // localStorage might be disabled (private mode, disabled storage)
    }
  }

  // Don't show anything if dismissed or just briefly offline
  if (Date.now() < dismissedUntil) return null;

  // Decide what to show
  const showPending = pendingCount > 0;
  const showOffline = debouncedOffline;
  const showSyncing = syncing;

  if (!showOffline && !showPending && !showSyncing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 pr-10 text-sm font-medium text-[#FBF9F6] transition-all duration-300"
      style={{
        background: showOffline
          ? "rgb(180 83 9)"   // amber — real offline
          : showSyncing
          ? "rgb(6 27 14)"    // deep forest — syncing
          : "rgb(6 27 14)",   // deep forest — pending orders
      }}
      role="status"
      aria-live="polite"
    >
      {showOffline ? (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>You&apos;re offline — your cart is saved locally</span>
        </>
      ) : showSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Syncing your orders…</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" aria-hidden="true" />
          <span>
            {pendingCount} order{pendingCount !== 1 ? "s" : ""} waiting to sync
          </span>
          <button
            type="button"
            onClick={syncQueue}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-white/30"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Sync now
          </button>
        </>
      )}

      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Dismiss offline banner"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

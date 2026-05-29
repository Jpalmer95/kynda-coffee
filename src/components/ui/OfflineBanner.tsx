"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { WifiOff, Wifi, Cloud, RefreshCw, Check } from "lucide-react";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const { isOnline, pendingCount, syncing, syncQueue } = useOfflineSync();
  const [showReconnect, setShowReconnect] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track offline→online transitions for the "Back online" flash
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnect(true);
      setWasOffline(false);
      const t = setTimeout(() => setShowReconnect(false), 4000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && pendingCount === 0 && !showReconnect) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-300"
      style={{
        background: showReconnect
          ? "rgb(22 101 52)"  // forest green for success
          : isOnline
          ? "rgb(6 27 14)"   // deep forest for sync bar
          : "rgb(180 83 9)", // amber-600 for offline
        color: "#FBF9F6",
      }}
      role="status"
      aria-live="polite"
    >
      {showReconnect ? (
        <>
          <Wifi className="h-4 w-4" aria-hidden="true" />
          <span>Back online</span>
          {pendingCount > 0 && (
            <span className="opacity-80"> — syncing {pendingCount} order{pendingCount > 1 ? "s" : ""}…</span>
          )}
        </>
      ) : !isOnline ? (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>You&apos;re offline — your cart is saved locally</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-4 w-4" aria-hidden="true" />
          <span>
            {syncing
              ? "Syncing your orders…"
              : `${pendingCount} order${pendingCount > 1 ? "s" : ""} waiting`}
          </span>
          {!syncing && (
            <button
              type="button"
              onClick={syncQueue}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Sync now
            </button>
          )}
        </>
      ) : (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>All synced</span>
        </>
      )}
    </div>
  );
}

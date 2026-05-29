"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingOrders,
  removePendingOrder,
  updatePendingOrder,
  type PendingOrder,
} from "@/lib/idb";

const MAX_ATTEMPTS = 3;

/**
 * Hook that detects online/offline status and syncs pending orders
 * from IndexedDB when connectivity is restored.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncLockRef = useRef(false);

  // Keep pending count fresh
  const refreshPendingCount = useCallback(async () => {
    try {
      const orders = await getPendingOrders();
      setPendingCount(orders.length);
    } catch {
      // IDB not available (SSR or private mode)
      setPendingCount(0);
    }
  }, []);

  // Submit a single pending order
  const submitOrder = useCallback(async (order: PendingOrder): Promise<boolean> => {
    const endpoint =
      order.type === "menu" ? "/api/orders/submit" : "/api/checkout";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order.payload),
      });

      if (res.ok) {
        await removePendingOrder(order.id);
        return true;
      }

      // Non-OK but not a network issue — increment attempts
      if (res.status < 500) {
        const attempts = order.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await removePendingOrder(order.id);
          return false;
        }
        await updatePendingOrder({ ...order, attempts });
        return false;
      }

      // Server error — retry later
      return false;
    } catch {
      // Network still flaky — leave in queue
      return false;
    }
  }, []);

  // Drain the pending queue
  const syncQueue = useCallback(async () => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setSyncing(true);

    try {
      const orders = await getPendingOrders();
      // Sort oldest first
      orders.sort((a, b) => a.created_at.localeCompare(b.created_at));

      for (const order of orders) {
        if (!navigator.onLine) break;
        await submitOrder(order);
      }

      await refreshPendingCount();
    } finally {
      setSyncing(false);
      syncLockRef.current = false;
    }
  }, [submitOrder, refreshPendingCount]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue(); // Auto-sync when back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial count + sync if online
    refreshPendingCount();
    if (navigator.onLine) {
      // Defer to avoid blocking hydration
      setTimeout(() => syncQueue(), 2000);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue, refreshPendingCount]);

  return { isOnline, pendingCount, syncing, syncQueue };
}

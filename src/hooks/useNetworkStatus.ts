"use client";

import { useState, useEffect, useCallback } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const syncWhenOnline = useCallback((fn: () => void) => {
    if (navigator.onLine) {
      fn();
    } else {
      const handler = () => {
        fn();
        window.removeEventListener("online", handler);
      };
      window.addEventListener("online", handler);
    }
  }, []);

  return { isOnline, syncWhenOnline };
}

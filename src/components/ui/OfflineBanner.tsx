"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };
    const onOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    setIsOnline(navigator.onLine);
    if (!navigator.onLine) setShowBanner(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        isOnline
          ? "bg-sage text-white"
          : "bg-amber-500 text-white"
      }`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" aria-hidden="true" />
          Back online
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          You&apos;re offline. Your cart is saved locally.
        </>
      )}
    </div>
  );
}

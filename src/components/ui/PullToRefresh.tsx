"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      const y = e.touches[0].clientY;
      const diff = y - startY.current;
      if (diff > 0) {
        setPulling(true);
        setProgress(Math.min(diff / threshold, 1));
        if (diff > threshold) {
          e.preventDefault();
        }
      }
    },
    [refreshing]
  );

  const onTouchEnd = useCallback(async () => {
    if (progress >= 1 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch {
        // ignore
      } finally {
        setRefreshing(false);
        setPulling(false);
        setProgress(0);
      }
    } else {
      setPulling(false);
      setProgress(0);
    }
  }, [progress, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <div ref={containerRef} className="relative">
      {(pulling || refreshing) && (
        <div
          className="absolute left-0 right-0 z-20 flex items-center justify-center transition-all"
          style={{
            top: 0,
            height: `${progress * threshold}px`,
            opacity: progress,
          }}
        >
          {refreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-rust" />
          ) : (
            <div
              className="h-5 w-5 rounded-full border-2 border-rust/30 border-t-rust transition-transform"
              style={{ transform: `rotate(${progress * 360}deg)` }}
            />
          )}
        </div>
      )}
      <div
        style={{
          transform: pulling || refreshing ? `translateY(${progress * threshold}px)` : undefined,
          transition: pulling ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

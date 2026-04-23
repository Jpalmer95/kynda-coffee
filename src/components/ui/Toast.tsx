"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "cart";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-sage" aria-hidden="true" />,
  error: <AlertCircle className="h-5 w-5 text-rust" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-mocha" aria-hidden="true" />,
  cart: <ShoppingBag className="h-5 w-5 text-rust" aria-hidden="true" />,
};

const STYLES: Record<ToastType, string> = {
  success: "border-sage/30 bg-white",
  error: "border-rust/30 bg-white",
  info: "border-latte/40 bg-white",
  cart: "border-rust/30 bg-white",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed right-0 top-0 z-[100] flex flex-col gap-2 p-4 sm:p-6"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(t.id), 300);
    }, t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onRemove]);

  return (
    <div
      className={cn(
        "flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm",
        STYLES[t.type],
        exiting ? "animate-toast-out" : "animate-toast-in"
      )}
      role="alert"
    >
      <div className="mt-0.5 flex-shrink-0">{ICONS[t.type]}</div>
      <p className="flex-1 text-sm font-medium text-espresso">{t.message}</p>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => onRemove(t.id), 300);
        }}
        className="flex-shrink-0 rounded-lg p-1 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

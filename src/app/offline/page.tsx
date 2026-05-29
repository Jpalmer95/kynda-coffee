import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline — Kynda Coffee",
  description: "You appear to be offline. Reconnect to browse our menu, place orders, and shop merch.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      {/* Icon */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-surface">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-sand"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      {/* Heading */}
      <h1 className="font-heading text-4xl font-semibold text-foreground sm:text-5xl">
        You&apos;re Offline
      </h1>

      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Looks like you lost connection. No worries — your cart is saved locally and
        will be ready when you&apos;re back online.
      </p>

      {/* Tips */}
      <div className="mt-8 w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-6 text-left">
        <h2 className="font-heading text-lg font-medium text-foreground">
          What you can try:
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Check your Wi-Fi or cellular connection
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Toggle Airplane mode on and off
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Pull down to refresh when you&apos;re reconnected
          </li>
        </ul>
      </div>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        className="btn-accent mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Try Again
      </button>

      {/* Cached pages link */}
      <p className="mt-6 text-sm text-muted-foreground">
        Some pages may still be available from cache.{" "}
        <Link href="/menu" className="text-primary underline underline-offset-2 hover:no-underline">
          Try the menu →
        </Link>
      </p>
    </div>
  );
}

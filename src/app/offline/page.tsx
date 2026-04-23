"use client";

import Link from "next/link";
import { WifiOff, Home, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-latte/20">
          <WifiOff className="h-10 w-10 text-mocha" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-heading text-2xl sm:text-3xl font-bold text-espresso">
          You&apos;re Offline
        </h1>
        <p className="mt-2 text-mocha">
          It looks like you lost your internet connection. Some features may be unavailable until you reconnect.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary inline-flex"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <Link href="/" className="btn-secondary inline-flex">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </section>
  );
}

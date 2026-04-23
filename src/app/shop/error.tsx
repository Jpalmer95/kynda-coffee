"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Shop error:", error);
  }, [error]);

  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold text-espresso">Unable to load shop</h1>
        <p className="mt-2 text-sm text-mocha">
          Something went wrong while loading the shop. Please try again.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="btn-primary inline-flex items-center justify-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <Link href="/" className="btn-secondary inline-flex items-center justify-center">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </section>
  );
}

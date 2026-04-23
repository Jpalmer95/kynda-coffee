"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <section className="section-padding min-h-[60vh] flex items-center">
      <div className="container-max max-w-lg mx-auto text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Something went wrong
        </h1>
        <p className="mt-2 text-mocha">
          We hit an unexpected error. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-mocha/50 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
          <button
            onClick={reset}
            className="btn-primary inline-flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="btn-secondary inline-flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rust" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-2xl font-bold text-espresso">Something went wrong</h1>
        <p className="mt-2 text-sm text-mocha">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <Link href="/" className="btn-secondary inline-flex">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </section>
  );
}

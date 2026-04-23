"use client";

import Link from "next/link";
import { Coffee, ArrowLeft, Home, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <section className="section-padding min-h-[70vh] flex items-center">
      <div className="container-max max-w-lg mx-auto text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cream">
          <Coffee className="h-10 w-10 text-mocha" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-heading text-4xl font-bold text-espresso">
          404
        </h1>
        <p className="mt-2 text-lg text-mocha">
          This page seems to have gone cold.
        </p>
        <p className="mt-1 text-sm text-mocha/70">
          We couldn&apos;t find what you were looking for.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary inline-flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </button>
          <Link href="/" className="btn-primary inline-flex items-center justify-center">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <Link href="/search" className="btn-secondary inline-flex items-center justify-center">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </section>
  );
}

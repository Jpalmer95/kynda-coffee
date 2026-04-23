"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-cream text-espresso">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <h1 className="font-heading text-4xl font-bold text-espresso">
            Oops
          </h1>
          <p className="mt-2 text-mocha">
            A critical error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-mocha/50 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-6 rounded-xl bg-espresso px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-espresso/90"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}

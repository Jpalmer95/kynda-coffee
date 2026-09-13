"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, X } from "lucide-react";

/**
 * Site-wide relocation announcement bar.
 *
 * Rendered inside the fixed <Header> stack so it travels with the nav and
 * inherits the KDS "no site chrome" rule (Header returns null on /kds).
 *
 * Dismissal persists in localStorage — one click hides it for good (the
 * message is a one-season announcement, not a recurring prompt).
 * Render is gated on `mounted` so dismissed visitors never see a flash.
 */
const DISMISS_KEY = "kynda-relocation-banner-dismissed-2026";

const NEW_LOCATION_MAPS_URL =
  "https://maps.google.com/?q=4909+RM+2147,+Horseshoe+Bay,+TX+78657";

export function RelocationBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // localStorage may be unavailable (private mode) — show the banner.
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore — banner stays hidden for this page view.
    }
  }

  if (!mounted || dismissed) return null;

  return (
    <div
      className="relative bg-primary text-primary-foreground"
      role="region"
      aria-label="Relocation announcement"
    >
      <div className="container-max flex items-center gap-2 px-4 py-2.5 pr-11 sm:gap-3 sm:px-6 lg:px-8">
        <MapPin className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
        <p className="flex-1 text-center text-xs font-normal leading-snug sm:text-left sm:text-[13px]">
          <span className="font-semibold">
            Kynda Coffee is excited to announce that it will be relocating this
            Winter 2026!
          </span>{" "}
          <span>
            Just 1 minute down the road at{" "}
            <a
              href={NEW_LOCATION_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 rounded-sm"
            >
              4909 RM 2147, Horseshoe Bay, TX 78657
            </a>
            .{" "}
            <Link
              href="/moving"
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 rounded-sm"
            >
              See what&apos;s coming
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
          aria-label="Dismiss relocation announcement"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

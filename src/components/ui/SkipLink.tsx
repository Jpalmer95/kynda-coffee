"use client";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-espresso focus:px-4 focus:py-2 focus:text-cream focus:text-sm focus:font-medium"
    >
      Skip to main content
    </a>
  );
}

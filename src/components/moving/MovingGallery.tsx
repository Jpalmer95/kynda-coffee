"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import type { ResolvedSlot } from "@/lib/moving/content";

/**
 * The four new-location renders. Clicking a tile opens an accessible lightbox
 * (Esc to close, arrow keys to step through).
 */
export function MovingGallery({ slots }: { slots: ResolvedSlot[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    const last = openIndex;
    setOpenIndex(null);
    if (last !== null) triggerRefs.current[last]?.focus();
  }, [openIndex]);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) =>
        current === null ? current : (current + delta + slots.length) % slots.length
      );
    },
    [slots.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }

    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [openIndex, close, step]);

  const active = openIndex === null ? null : slots[openIndex];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {slots.map((slot, index) => (
          <button
            key={slot.id}
            ref={(el) => {
              triggerRefs.current[index] = el;
            }}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={`View ${slot.label} — ${slot.src ? "render" : "render coming soon"}`}
            className="group relative block overflow-hidden rounded-3xl border border-latte/20 bg-card text-left transition-transform focus-visible:ring-2 focus-visible:ring-forest card-lift"
          >
            <div className="relative aspect-[16/9] w-full">
              {slot.src ? (
                <Image
                  src={slot.src}
                  alt={slot.alt}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <Placeholder label={slot.label} index={index} />
              )}
            </div>
            <p className="px-5 py-3 text-sm font-medium text-mocha">{slot.label}</p>
          </button>
        ))}
      </div>

      {active && openIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.label} — enlarged view`}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[16/9] w-full bg-surface-deep">
              {active.src ? (
                <Image
                  src={active.src}
                  alt={active.alt}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              ) : (
                <Placeholder label={active.label} index={openIndex} large />
              )}
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <p className="text-sm font-medium text-espresso">{active.label}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous render"
                  className="rounded-lg p-2 text-mocha transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-forest"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next render"
                  className="rounded-lg p-2 text-mocha transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-forest"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Close enlarged view"
                  className="ml-1 rounded-lg p-2 text-mocha transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-forest"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Fallback tile for a slot whose render file isn't in place yet. */
function Placeholder({
  label,
  index,
  large = false,
}: {
  label: string;
  index: number;
  large?: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-deep via-surface to-forest-700 px-6 text-center">
      <ImageIcon
        className={large ? "h-9 w-9 text-sand/80" : "h-6 w-6 text-sand/80"}
        aria-hidden="true"
      />
      <p className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-sand/90">
        {label}
      </p>
      <p className="text-xs uppercase tracking-wide text-sand/60">
        Render coming soon
      </p>
      <p className="text-[11px] text-sand/45">Slot {index + 1} of 4</p>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ORDERING_PAUSED_NOTICE } from "@/lib/ordering/availability";

/**
 * Notice shown on the café ordering surfaces (/menu, /order) while
 * café ordering is paused for the relocation. Server component — no client JS.
 */
export function OrderingPausedNotice({ body }: { body?: string }) {
  return (
    <section
      className="mx-auto mt-8 max-w-3xl rounded-[12px] border border-forest/25 bg-forest/5 p-6 text-center sm:p-8"
      aria-labelledby="ordering-paused-title"
    >
      <p className="mb-2 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-forest">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        {ORDERING_PAUSED_NOTICE.eyebrow}
      </p>
      <h2
        id="ordering-paused-title"
        className="font-heading text-2xl font-bold text-espresso sm:text-3xl"
      >
        {ORDERING_PAUSED_NOTICE.title}
      </h2>
      <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-mocha sm:text-base">
        {body ?? ORDERING_PAUSED_NOTICE.body}
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={ORDERING_PAUSED_NOTICE.ctaHref}
          className="btn-primary w-full justify-center sm:w-auto"
        >
          {ORDERING_PAUSED_NOTICE.ctaLabel}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href={ORDERING_PAUSED_NOTICE.shopHref}
          className="btn-secondary w-full justify-center sm:w-auto"
        >
          {ORDERING_PAUSED_NOTICE.shopLabel}
        </Link>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { formatMoney } from "@/lib/pos/catalog";
import { discountPct, type Special } from "@/lib/marketing/specials";

/**
 * Owner-curated Monthly Specials banner shown at the very top of the Menu
 * ordering page (Epic 5). Driven by the `specials` table — the same source of
 * truth that seeds marketing campaigns. Rendered server-side; only shows when
 * the owner has curated at least one live special. When empty, the menu falls
 * back to the heuristic MenuSpecials carousel inside MenuClient.
 */
export function CuratedSpecials({ specials }: { specials: Special[] }) {
  if (specials.length === 0) return null;

  return (
    <section className="mx-auto mb-10 max-w-7xl rounded-2xl border border-forest/20 bg-gradient-to-br from-forest/5 via-card to-accent/10 p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/10">
          <Sparkles className="h-5 w-5 text-forest" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">This Month&apos;s Specials</h2>
          <p className="text-sm text-mocha">Featured by Kynda — available for a limited time</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specials.map((special) => {
          const disc = discountPct(special);
          return (
            <article
              key={special.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-latte/40 bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-deep">
                {special.image_url ? (
                  <Image
                    src={special.image_url}
                    alt={special.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
                      <Star className="h-8 w-8 text-forest/40" />
                    </div>
                  </div>
                )}

                {special.badge && (
                  <div className="absolute left-3 top-3 rounded-full bg-forest px-3 py-1 text-xs font-semibold text-sand shadow-sm">
                    {special.badge}
                  </div>
                )}
                {disc !== null && (
                  <div className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                    {disc}% off
                  </div>
                )}
                {special.price_cents != null && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-surface/90 px-3 py-1.5 text-sm font-bold text-sand shadow-sm backdrop-blur-sm">
                    {special.compare_at_cents != null && special.compare_at_cents > special.price_cents && (
                      <span className="text-xs font-normal text-sand/60 line-through">
                        {formatMoney(special.compare_at_cents)}
                      </span>
                    )}
                    {formatMoney(special.price_cents)}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <h3 className="font-heading text-lg font-bold text-espresso line-clamp-1">{special.title}</h3>
                {special.subtitle && <p className="mt-0.5 text-sm font-medium text-forest">{special.subtitle}</p>}
                {special.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-mocha">{special.description}</p>
                )}
                <div className="mt-auto pt-3">
                  <Link
                    href={special.provider_item_id ? `/order?item=${special.provider_item_id}` : "/order"}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-forest hover:underline"
                  >
                    {special.cta_label || "Order now"} →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

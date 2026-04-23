"use client";

import Link from "next/link";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { formatPrice } from "@/lib/utils";
import { Clock } from "lucide-react";

export function RecentlyViewedStrip() {
  const { recent } = useRecentlyViewed();

  if (recent.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 bg-cream/50" aria-label="Recently viewed products">
      <div className="container-max">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="h-5 w-5 text-mocha" aria-hidden="true" />
          <h2 className="font-heading text-lg sm:text-xl font-bold text-espresso">
            Recently Viewed
          </h2>
        </div>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
          {recent.map((product) => (
            <Link
              key={product.id}
              href={`/shop/product/${product.slug}`}
              className="group flex-shrink-0 w-36 sm:w-44 snap-start"
            >
              <div className="aspect-square overflow-hidden rounded-xl border border-latte/20 bg-white">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-800 to-stone-900 text-2xl">
                    {product.category === "coffee-beans" ? "☕" : "✨"}
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-xs sm:text-sm font-medium text-espresso">
                {product.name}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-espresso">
                {formatPrice(product.price_cents)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

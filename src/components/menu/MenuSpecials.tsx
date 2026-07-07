"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { PosCatalogItem } from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";

interface MenuSpecialsProps {
  items: PosCatalogItem[];
  onSelectItem: (item: PosCatalogItem) => void;
}

// Heuristic scoring for "specialness" — items with images, reasonable prices,
// and name keywords are surfaced here. Admin can refine via catalog_overrides.
function scoreSpecialness(item: PosCatalogItem): number {
  let score = 0;

  // Has an image (essential for visual appeal)
  if (item.imageUrls.length > 0) score += 10;

  // Price sweet spot ($3–$12 is typical café drink/food range)
  const price = item.priceCents / 100;
  if (price >= 300 && price <= 1200) score += 5;

  // Keyword boosts
  const nameLower = item.name.toLowerCase();
  const descLower = item.description.toLowerCase();
  const text = `${nameLower} ${descLower}`;

  if (/\bspecial\b|\bfeatured\b|\bsignature\b|\bhouse\b|\bclassic\b/.test(text)) score += 8;
  if (/\blatte\b|\bcappuccino\b|\bmocha\b|\bcold brew\b/.test(text)) score += 4;
  if (/\bseasonal\b|\bpumpkin\b|\bholiday\b|\bpeppermint\b/.test(text)) score += 6;
  if (/\bnew\b|\bjust added\b|\blimited\b/.test(text)) score += 7;
  if (/\bcombo\b|\bdeal\b|\bvalue\b/.test(text)) score += 5;

  // Penalize plain items
  if (item.name.length < 8) score -= 2;

  return score;
}

// Build the specials list. Items explicitly marked is_featured (via admin
// catalog overrides) always come first. If there aren't enough featured items
// to fill the carousel, we top up with the heuristic-scored items.
function getSpecialsList(items: PosCatalogItem[], maxCount = 6): PosCatalogItem[] {
  const featured = items.filter((item) => item.isFeatured);

  const scored = items
    .filter((item) => !item.isFeatured)
    .map((item) => ({ item, score: scoreSpecialness(item) }))
    .filter((x) => x.score > 8) // Minimum threshold
    .sort((a, b) => b.score - a.score);

  const toppedUp = scored.map((x) => x.item);
  return [...featured, ...toppedUp].slice(0, maxCount);
}

export function MenuSpecials({ items, onSelectItem }: MenuSpecialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const specials = getSpecialsList(items);
  if (specials.length === 0) return null;

  const itemsPerView = 3;
  const maxIndex = Math.max(0, specials.length - itemsPerView);

  function prev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    setCurrentIndex((i) => Math.min(maxIndex, i + 1));
  }

  const visibleSpecials = specials.slice(currentIndex, currentIndex + itemsPerView);

  return (
    <section className="mb-12 rounded-2xl bg-gradient-to-br from-forest/5 via-card to-accent/10 border border-forest/20 p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/10">
            <Sparkles className="h-5 w-5 text-forest" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              Today's Specials
            </h2>
            <p className="text-sm text-mocha">
              Handpicked favorites from our baristas
            </p>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="hidden sm:flex gap-2">
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-latte/30 bg-card text-mocha hover:border-forest hover:text-forest disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous specials"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            disabled={currentIndex >= maxIndex}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-latte/30 bg-card text-mocha hover:border-forest hover:text-forest disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next specials"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Specials grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSpecials.map((item) => (
          <button
            key={item.providerItemId}
            onClick={() => onSelectItem(item)}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-latte/40 bg-card text-left transition-all hover:border-forest/60 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-deep">
              {item.imageUrls[0] ? (
                <Image
                  src={item.imageUrls[0]}
                  alt={item.name}
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

              {/* Featured badge */}
              <div className="absolute top-3 left-3 rounded-full bg-forest px-3 py-1 text-xs font-semibold text-surface-deep shadow-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-surface-deep" />
                  Featured
                </div>
              </div>

              {/* Price badge */}
              <div className="absolute bottom-3 right-3 rounded-lg bg-surface/90 px-3 py-1.5 text-sm font-bold text-sand shadow-sm backdrop-blur-sm border border-latte/10">
                {formatMoney(item.priceCents)}
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-4 sm:p-5">
              <h3 className="font-heading text-lg font-bold text-espresso transition-colors group-hover:text-forest line-clamp-1">
                {item.name}
              </h3>
              {item.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-mocha">
                  {item.description}
                </p>
              )}
              <div className="mt-auto pt-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-forest">
                  View details →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Mobile pagination dots */}
      {specials.length > itemsPerView && (
        <div className="mt-4 flex justify-center gap-1.5 sm:hidden">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? "w-8 bg-forest" : "w-2 bg-latte/40"
              }`}
              aria-label={`Go to specials page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

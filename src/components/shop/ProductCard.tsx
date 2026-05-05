"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

// Generate a consistent placeholder gradient based on product category
function getCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    "coffee-beans": "from-amber-800 to-stone-900",
    "merch-apparel": "from-stone-700 to-stone-900",
    "merch-mugs": "from-amber-700 to-orange-900",
    "merch-glassware": "from-sky-700 to-slate-900",
    "merch-accessories": "from-emerald-800 to-stone-900",
    "subscription": "from-rust to-espresso",
    "gift-card": "from-latte to-mocha",
    "catering": "from-sage to-mocha",
  };
  return gradients[category] ?? "from-stone-600 to-stone-800";
}

// Default product images by category
function getDefaultImage(category: string): string | null {
  const images: Record<string, string> = {
    "coffee-beans": "/images/coffee-beans.jpg",
    "merch-mugs": "/images/ceramic-mug.jpg",
  };
  return images[category] ?? null;
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "coffee-beans": "☕",
    "merch-apparel": "👕",
    "merch-mugs": "☕",
    "merch-glassware": "🥃",
    "merch-accessories": "👜",
    "subscription": "📦",
    "gift-card": "🎁",
    "catering": "🍽️",
  };
  return icons[category] ?? "✨";
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "coffee-beans": "Coffee Beans",
    "merch-apparel": "Apparel",
    "merch-mugs": "Mugs",
    "merch-glassware": "Glassware",
    "merch-accessories": "Accessories",
    "subscription": "Subscription",
    "gift-card": "Gift Card",
    "catering": "Catering",
  };
  return labels[category] ?? category;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const gradient = getCategoryGradient(product.category);
  const icon = getCategoryIcon(product.category);
  const defaultImage = getDefaultImage(product.category);
  const hasImage = product.images && product.images.length > 0;
  const displayImage = hasImage ? product.images[0] : defaultImage;
  const categoryLabel = getCategoryLabel(product.category);

  return (
    <div className="group relative block overflow-hidden rounded-[24px] border border-latte/10 bg-white transition-all duration-300 hover:shadow-hover hover:-translate-y-1">
      {/* Product Image */}
      <Link
        href={`/shop/product/${product.slug}`}
        className="block"
        aria-label={`${product.name}, ${categoryLabel}, ${formatPrice(product.price_cents)}`}
      >
        <div className={`relative aspect-square overflow-hidden bg-gradient-to-br ${gradient}`}>
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl sm:text-6xl opacity-60 transition-transform duration-300 group-hover:scale-110">
                {icon}
              </span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-espresso/0 transition-colors duration-300 group-hover:bg-espresso/10" aria-hidden="true" />
          {/* Featured badge */}
          {product.is_featured && (
            <div className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded-full bg-rust px-2.5 py-1 text-[11px] sm:text-xs font-medium text-white">
              Featured
            </div>
          )}
          {/* Sale badge */}
          {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
            <div className="absolute right-2 top-2 sm:right-3 sm:top-3 rounded-full bg-sage px-2.5 py-1 text-[11px] sm:text-xs font-medium text-white">
              Sale
            </div>
          )}
          {/* Out of stock badge */}
          {product.track_inventory && (product.inventory_count ?? 0) <= 0 && (
            <div className="absolute inset-x-0 bottom-0 bg-espresso/80 py-2 text-center text-xs font-medium text-white backdrop-blur-sm">
              Out of Stock
            </div>
          )}
        </div>
      </Link>

      {/* Quick View button (desktop hover) */}
      {onQuickView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 items-center justify-center sm:flex sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-espresso shadow-lg hover:bg-white">
            Quick View
          </span>
        </button>
      )}

      {/* Product Info */}
      <Link href={`/shop/product/${product.slug}`} className="block p-4 sm:p-5">
        {/* Category tag */}
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-mocha/60">
          {categoryLabel}
        </p>

        <h3 className="mt-1 font-heading text-base sm:text-lg font-semibold text-espresso transition-colors duration-200 group-hover:text-rust line-clamp-1">
          {product.name}
        </h3>

        <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-mocha">
          {product.description}
        </p>

        {/* Coffee-specific info */}
        {product.roast_level && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-latte/30 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-mocha capitalize">
              {product.roast_level} roast
            </span>
            {product.origin && (
              <span className="text-[11px] sm:text-xs text-mocha/60">{product.origin}</span>
            )}
          </div>
        )}

        {/* Tasting notes */}
        {product.tasting_notes && product.tasting_notes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.tasting_notes.slice(0, 3).map((note) => (
              <span
                key={note}
                className="rounded-full bg-cream px-2 py-0.5 text-[11px] sm:text-xs text-mocha"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-espresso">
            {formatPrice(product.price_cents)}
          </span>
          {product.compare_at_price_cents && (
            <span className="text-xs sm:text-sm text-mocha line-through">
              {formatPrice(product.compare_at_price_cents)}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

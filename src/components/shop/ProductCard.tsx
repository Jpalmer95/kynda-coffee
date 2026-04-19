"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
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
  };
  return icons[category] ?? "✨";
}

export function ProductCard({ product }: ProductCardProps) {
  const gradient = getCategoryGradient(product.category);
  const icon = getCategoryIcon(product.category);
  const defaultImage = getDefaultImage(product.category);
  const hasImage = product.images && product.images.length > 0;
  const displayImage = hasImage ? product.images[0] : defaultImage;

  return (
    <Link
      href={`/shop/product/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-latte/20 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      {/* Product Image */}
      <div className={`relative aspect-square overflow-hidden bg-gradient-to-br ${gradient}`}>
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-6xl opacity-60 transition-transform duration-300 group-hover:scale-110">
              {icon}
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-espresso/0 transition-colors duration-300 group-hover:bg-espresso/10" />
        {/* Featured badge */}
        {product.is_featured && (
          <div className="absolute left-3 top-3 rounded-full bg-rust px-3 py-1 text-xs font-medium text-white">
            Featured
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5">
        {/* Category tag */}
        <p className="text-xs font-medium uppercase tracking-wider text-mocha/60">
          {product.category.replace("-", " ")}
        </p>

        <h3 className="mt-1 font-heading text-lg font-semibold text-espresso transition-colors duration-200 group-hover:text-rust">
          {product.name}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm text-mocha">
          {product.description}
        </p>

        {/* Coffee-specific info */}
        {product.roast_level && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block rounded-full bg-latte/30 px-2 py-0.5 text-xs font-medium text-mocha capitalize">
              {product.roast_level} roast
            </span>
            {product.origin && (
              <span className="text-xs text-mocha/60">{product.origin}</span>
            )}
          </div>
        )}

        {/* Tasting notes */}
        {product.tasting_notes && product.tasting_notes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.tasting_notes.slice(0, 3).map((note) => (
              <span
                key={note}
                className="rounded-full bg-cream px-2 py-0.5 text-xs text-mocha"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-espresso">
            {formatPrice(product.price_cents)}
          </span>
          {product.compare_at_price_cents && (
            <span className="text-sm text-mocha line-through">
              {formatPrice(product.compare_at_price_cents)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

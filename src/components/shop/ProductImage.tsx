"use client";

import React from "react";
import Image, { ImageProps } from "next/image";
import type { Product } from "@/types";

interface ProductImageProps {
  product: Product;
  className?: string;
  sizes?: ImageProps["sizes"];
  priority?: boolean;
  // Optional explicit src override (rare)
  src?: string;
}

/**
 * Robust product image renderer with:
 * - Next.js Image for optimization + LCP
 * - Graceful fallback to category placeholder / emoji icon
 * - Square-sourced images are expected to already be in product.images[0]
 */
export function ProductImage({
  product,
  className = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  src,
}: ProductImageProps) {
  const hasImage = !!product.images && product.images.length > 0;
  const imageSrc = src ?? (hasImage ? product.images[0] : null);

  // Category metadata for fallback
  const gradientClass = getCategoryGradient(product.category);
  const icon = getCategoryIcon(product.category);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradientClass} ${className}`}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={sizes}
          priority={priority}
          onError={(e) => {
            // Hide broken image and show fallback icon gradient (simple & reliable)
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            // Trigger sibling fallback visibility (the icon div below)
            const parent = target.parentElement;
            if (parent) {
              const fallback = parent.querySelector(".product-image-fallback") as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }
          }}
        />
      ) : null}

      {/* Smooth fallback icon/gradient (shown on error or when no image) */}
      <div
        className={`product-image-fallback absolute inset-0 flex h-full w-full items-center justify-center ${imageSrc ? "hidden" : ""}`}
      >
        <span className="text-5xl opacity-60 transition-transform duration-300 group-hover:scale-110 sm:text-6xl">
          {icon}
        </span>
      </div>
    </div>
  );
}

// Consistent category mappings (kept private to this module)
function getCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    "coffee-beans": "from-amber-800 to-stone-900",
    "merch-apparel": "from-stone-700 to-stone-900",
    "merch-mugs": "from-amber-700 to-orange-900",
    "merch-glassware": "from-sky-700 to-slate-900",
    "merch-accessories": "from-emerald-800 to-stone-900",
    subscription: "from-rust to-espresso",
    "gift-card": "from-latte to-mocha",
    catering: "from-sage to-mocha",
  };
  return gradients[category] ?? "from-stone-600 to-stone-800";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "coffee-beans": "☕",
    "merch-apparel": "👕",
    "merch-mugs": "☕",
    "merch-glassware": "🥃",
    "merch-accessories": "👜",
    subscription: "📦",
    "gift-card": "🎁",
    catering: "🍽️",
  };
  return icons[category] ?? "✨";
}

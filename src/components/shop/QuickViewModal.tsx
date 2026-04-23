"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { X, ShoppingBag, Heart } from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { useFavoritesStore } from "@/hooks/useFavorites";
import { useToast } from "@/components/ui/Toast";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const { toggle, isFavorite } = useFavoritesStore();
  const { toast } = useToast();
  const trapRef = useFocusTrap(!!product);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (product) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [product, handleKeyDown]);

  if (!product) return null;

  const favorite = isFavorite(product.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view ${product.name}`}
    >
      <div ref={trapRef} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-mocha shadow-sm hover:text-espresso focus:outline-none focus:ring-2 focus:ring-rust focus:ring-offset-2"
          aria-label="Close quick view"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="aspect-square bg-gradient-to-br from-amber-800 to-stone-900">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">
                {product.category === "coffee-beans" ? "☕" : "✨"}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-rust">
              {product.category.replace(/-/g, " ")}
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-espresso">
              {product.name}
            </h2>
            <p className="mt-2 text-2xl font-bold text-espresso">
              {formatPrice(product.price_cents)}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-mocha line-clamp-4">
              {product.description || "No description available."}
            </p>

            {/* Actions */}
            <div className="mt-auto pt-5 flex flex-col gap-2">
              <button
                onClick={() => {
                  addItem(product, 1);
                  toast(`Added ${product.name} to cart`, "cart");
                  onClose();
                }}
                className="btn-primary w-full"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(product.id)}
                  className="btn-secondary flex-1"
                >
                  <Heart
                    className={`mr-1.5 h-4 w-4 ${favorite ? "fill-rust text-rust" : ""}`}
                  />
                  {favorite ? "Saved" : "Save"}
                </button>
                <Link
                  href={`/shop/product/${product.slug}`}
                  onClick={onClose}
                  className="btn-secondary flex-1 text-center"
                >
                  Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

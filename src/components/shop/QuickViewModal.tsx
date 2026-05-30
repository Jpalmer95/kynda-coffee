"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { X, ShoppingBag, Heart, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { useFavoritesStore } from "@/hooks/useFavorites";
import { useToast } from "@/components/ui/Toast";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";
import { ProductImage } from "./ProductImage";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const { toggle, isFavorite } = useFavoritesStore();
  const { toast } = useToast();
  const trapRef = useFocusTrap(!!product);
  const [quantity, setQuantity] = useState(1);

  // Reset quantity each time a new product is opened.
  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view ${product.name}`}
    >
      <div ref={trapRef} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex items-center justify-center rounded-full bg-card/90 p-2 text-mocha shadow-sm hover:text-espresso focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          aria-label="Close quick view"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <ProductImage product={product} className="aspect-square" />
          </div>

          {/* Details */}
          <div className="flex flex-col p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-forest">
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
            <div className="mt-auto pt-5 flex flex-col gap-3">
              {/* Quantity stepper */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-espresso transition-colors hover:bg-latte/20 disabled:opacity-40"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-base font-semibold text-espresso">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-espresso transition-colors hover:bg-latte/20"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  addItem(product, quantity);
                  toast(
                    `Added ${quantity} × ${product.name} to cart`,
                    "cart"
                  );
                  onClose();
                }}
                className="btn-primary w-full"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add {quantity > 1 ? `${quantity} ` : ""}to Cart — {formatPrice(product.price_cents * quantity)}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(product.id)}
                  className="btn-secondary flex-1"
                >
                  <Heart
                    className={`mr-1.5 h-4 w-4 ${favorite ? "fill-rust text-forest" : ""}`}
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

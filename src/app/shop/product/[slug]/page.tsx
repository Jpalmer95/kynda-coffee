"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Minus, Plus, Check } from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import type { Product, GrindType } from "@/types";

function getDefaultImage(category: string): string | null {
  const images: Record<string, string> = {
    "coffee-beans": "/images/coffee-beans.jpg",
    "merch-mugs": "/images/ceramic-mug.jpg",
  };
  return images[category] ?? null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedGrind, setSelectedGrind] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetch(`/api/products`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.products ?? []).find(
          (p: Product) => p.slug === slug
        );
        setProduct(found ?? null);
        setLoading(false);
        // Set defaults
        if (found?.sizes?.[0]) setSelectedSize(found.sizes[0]);
        if (found?.grind_options?.[0]) setSelectedGrind(found.grind_options[0]);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    addItem(product, quantity, {
      size: selectedSize ?? undefined,
      color: selectedColor ?? undefined,
      grind: (selectedGrind as GrindType) ?? undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-max">
          <div className="animate-pulse">
            <div className="h-4 w-24 rounded bg-latte/20" />
            <div className="mt-8 grid gap-12 lg:grid-cols-2">
              <div className="aspect-square rounded-2xl bg-latte/20" />
              <div className="space-y-4">
                <div className="h-4 w-20 rounded bg-latte/20" />
                <div className="h-8 w-3/4 rounded bg-latte/20" />
                <div className="h-4 w-full rounded bg-latte/20" />
                <div className="h-4 w-2/3 rounded bg-latte/20" />
                <div className="h-10 w-24 rounded bg-latte/20" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <h1 className="font-heading text-3xl font-bold text-espresso">
            Product Not Found
          </h1>
          <p className="mt-2 text-mocha">
            We couldn&apos;t find that product. It may have been removed.
          </p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </section>
    );
  }

  const isCoffee = product.category === "coffee-beans";
  const isSubscription = product.category === "subscription";

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Breadcrumb */}
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-1 text-sm text-mocha transition-colors hover:text-espresso"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-amber-800 to-stone-900">
            {(product.images && product.images.length > 0) || getDefaultImage(product.category) ? (
              <img
                src={(product.images && product.images[0]) || getDefaultImage(product.category)!}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-8xl opacity-50">
                  {isCoffee ? "☕" : isSubscription ? "📦" : "✨"}
                </span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            {/* Category */}
            <p className="text-sm font-medium uppercase tracking-wider text-mocha/60">
              {product.category.replace("-", " ")}
            </p>

            {/* Name */}
            <h1 className="mt-2 font-heading text-3xl font-bold text-espresso sm:text-4xl">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-espresso">
                {formatPrice(product.price_cents)}
              </span>
              {isSubscription && (
                <span className="text-sm text-mocha">/month</span>
              )}
              {product.compare_at_price_cents && (
                <span className="text-lg text-mocha line-through">
                  {formatPrice(product.compare_at_price_cents)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-4 text-lg text-mocha">{product.description}</p>

            {/* Coffee-specific */}
            {isCoffee && (
              <>
                {product.roast_level && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="rounded-full bg-latte/30 px-3 py-1 text-sm font-medium text-mocha capitalize">
                      {product.roast_level} roast
                    </span>
                    {product.origin && (
                      <span className="text-sm text-mocha/60">
                        {product.origin}
                      </span>
                    )}
                  </div>
                )}

                {product.tasting_notes && product.tasting_notes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.tasting_notes.map((note) => (
                      <span
                        key={note}
                        className="rounded-full bg-cream px-3 py-1 text-sm text-mocha"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Grind Selection (Coffee) */}
            {isCoffee && product.grind_options && product.grind_options.length > 0 && (
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Grind
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.grind_options.map((grind) => (
                    <button
                      key={grind}
                      onClick={() => setSelectedGrind(grind)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        selectedGrind === grind
                          ? "bg-espresso text-cream"
                          : "border border-latte bg-white text-mocha hover:border-espresso"
                      }`}
                    >
                      {grind.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection (Merch) */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                        selectedSize === size
                          ? "border-espresso bg-espresso text-cream"
                          : "border-latte bg-white text-mocha hover:border-espresso"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {(product.colors as { name: string; hex: string }[]).map(
                    (color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                          selectedColor === color.name
                            ? "border-espresso scale-110"
                            : "border-latte hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {selectedColor === color.name && (
                          <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-espresso">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-latte bg-white text-espresso transition-colors hover:bg-latte/20"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-lg font-semibold text-espresso">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-latte bg-white text-espresso transition-colors hover:bg-latte/20"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="mt-8">
              <button
                onClick={handleAddToCart}
                disabled={added}
                className={`btn-primary w-full py-4 text-base ${
                  added ? "bg-sage hover:bg-sage" : ""
                }`}
              >
                {added ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Add to Cart — {formatPrice(product.price_cents * quantity)}
                  </>
                )}
              </button>
            </div>

            {/* Inventory indicator */}
            {product.inventory_count != null && product.inventory_count < 20 && (
              <p className="mt-3 text-center text-sm text-rust">
                Only {product.inventory_count} left in stock
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

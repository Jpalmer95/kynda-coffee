"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Minus, Plus, Check, Truck, Shield, RotateCcw, Heart, Share2 } from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { useFavoritesStore } from "@/hooks/useFavorites";
import { useToast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/utils";
import type { Product, GrindType } from "@/types";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { RecentlyViewedStrip } from "@/components/shop/RecentlyViewed";
import { ProductSchema, BreadcrumbSchema } from "@/components/seo/JsonLd";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { ImageLightbox } from "@/components/shop/ImageLightbox";

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
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedGrind, setSelectedGrind] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();
  const { toggle, isFavorite } = useFavoritesStore();
  const { add: addRecentlyViewed } = useRecentlyViewed();
  const favorite = product ? isFavorite(product.id) : false;

  useEffect(() => {
    fetch(`/api/products`)
      .then((res) => res.json())
      .then((data) => {
        const all = data.products ?? [];
        const found = all.find((p: Product) => p.slug === slug);
        setProduct(found ?? null);
        if (found) {
          setRelatedProducts(
            all
              .filter((p: Product) => p.category === found.category && p.id !== found.id)
              .slice(0, 4)
          );
          addRecentlyViewed(found);
        }
        setLoading(false);
        if (found?.sizes?.[0]) setSelectedSize(found.sizes[0]);
        if (found?.grind_options?.[0]) setSelectedGrind(found.grind_options[0]);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addItem(product, quantity, {
      size: selectedSize ?? undefined,
      color: selectedColor ?? undefined,
      grind: (selectedGrind as GrindType) ?? undefined,
    });
    setAdded(true);
    toast(`Added ${product.name} to cart`, "cart");
    setTimeout(() => setAdded(false), 2000);
  }, [product, quantity, selectedSize, selectedColor, selectedGrind, addItem, toast]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url = `${window.location.origin}/shop/product/${product.slug}`;
    const shareData = {
      title: product.name,
      text: product.description?.slice(0, 100) ?? "Check out this product from Kynda Coffee!",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard", "info");
    }
  }, [product, toast]);

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-max">
          <div className="animate-pulse">
            <div className="h-4 w-24 rounded bg-latte/20" />
            <div className="mt-6 sm:mt-8 grid gap-8 lg:grid-cols-2">
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
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Shop
          </Link>
        </div>
      </section>
    );
  }

  const isCoffee = product.category === "coffee-beans";
  const isSubscription = product.category === "subscription";
  const isOutOfStock = product.track_inventory && (product.inventory_count ?? 0) <= 0;
  const isLowStock = product.track_inventory && (product.inventory_count ?? 0) > 0 && (product.inventory_count ?? 0) < 20;
  const allImages = product.images?.length
    ? product.images
    : [getDefaultImage(product.category)].filter(Boolean) as string[];

  // Touch swipe for image gallery
  const touchStartX = useRef(0);
  const handleGalleryTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleGalleryTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && selectedImage < allImages.length - 1) {
        setSelectedImage((i) => i + 1);
      } else if (diff > 0 && selectedImage > 0) {
        setSelectedImage((i) => i - 1);
      }
    }
  }, [selectedImage, allImages.length]);

  return (
    <>
      <ProductSchema
        product={{
          name: product.name,
          description: product.description,
          image: allImages[0],
          slug: product.slug,
          price_cents: product.price_cents,
        }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://kyndacoffee.com" },
          { name: "Shop", url: "https://kyndacoffee.com/shop" },
          { name: product.name, url: `https://kyndacoffee.com/shop/product/${product.slug}` },
        ]}
      />
      <section className="section-padding pb-24 sm:pb-16">
      <div className="container-max">
        {/* Breadcrumb */}
        <Link
          href="/shop"
          className="mb-6 sm:mb-8 inline-flex items-center gap-1 rounded-lg text-sm text-mocha transition-colors hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shop
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image Gallery */}
          <div className="space-y-3">
            <div
              className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-amber-800 to-stone-900 cursor-zoom-in select-none touch-pan-y"
              onClick={() => setLightboxOpen(true)}
              onTouchStart={handleGalleryTouchStart}
              onTouchEnd={handleGalleryTouchEnd}
            >
              {allImages[selectedImage] ? (
                <img
                  src={allImages[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-7xl sm:text-8xl opacity-50">
                    {isCoffee ? "☕" : isSubscription ? "📦" : "✨"}
                  </span>
                </div>
              )}
              {/* Sale badge */}
              {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                <div className="absolute left-3 top-3 rounded-full bg-sage px-3 py-1 text-xs font-medium text-white">
                  Sale
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      selectedImage === i
                        ? "border-espresso"
                        : "border-transparent hover:border-latte"
                    }`}
                    aria-label={`View image ${i + 1} of ${allImages.length}`}
                    aria-current={selectedImage === i ? "true" : undefined}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            {/* Category */}
            <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-mocha/60">
              {product.category.replace(/-/g, " ")}
            </p>

            {/* Name */}
            <div className="mt-2 flex items-start justify-between gap-3">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso lg:text-4xl">
                {product.name}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-shrink-0 rounded-full p-2 bg-latte/20 text-mocha hover:bg-latte/40 transition-colors"
                  aria-label="Share this product"
                >
                  <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button
                  onClick={() => {
                    if (!product) return;
                    toggle(product.id);
                    toast(favorite ? "Removed from favorites" : "Added to favorites", "info");
                  }}
                  className={`flex-shrink-0 rounded-full p-2 transition-colors ${
                    favorite ? "bg-rust/10 text-rust" : "bg-latte/20 text-mocha hover:bg-latte/40"
                  }`}
                  aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={favorite}
                >
                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 ${favorite ? "fill-rust" : ""}`} />
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="mt-3 sm:mt-4 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-espresso">
                {formatPrice(product.price_cents)}
              </span>
              {isSubscription && (
                <span className="text-sm text-mocha">/month</span>
              )}
              {product.compare_at_price_cents && (
                <span className="text-base sm:text-lg text-mocha line-through">
                  {formatPrice(product.compare_at_price_cents)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-mocha leading-relaxed">
              {product.description}
            </p>

            {/* Coffee-specific */}
            {isCoffee && (
              <>
                {product.roast_level && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-latte/30 px-3 py-1 text-xs sm:text-sm font-medium text-mocha capitalize">
                      {product.roast_level} roast
                    </span>
                    {product.origin && (
                      <span className="text-xs sm:text-sm text-mocha/60">
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
                        className="rounded-full bg-cream px-3 py-1 text-xs sm:text-sm text-mocha"
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
              <div className="mt-5 sm:mt-6">
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Grind
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.grind_options.map((grind) => (
                    <button
                      key={grind}
                      onClick={() => setSelectedGrind(grind)}
                      className={`rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
                        selectedGrind === grind
                          ? "bg-espresso text-cream"
                          : "border border-latte bg-white text-mocha hover:border-espresso"
                      }`}
                      aria-pressed={selectedGrind === grind}
                    >
                      {grind.replace(/-/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection (Merch) */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border px-4 py-2 text-xs sm:text-sm font-medium transition-all ${
                        selectedSize === size
                          ? "border-espresso bg-espresso text-cream"
                          : "border-latte bg-white text-mocha hover:border-espresso"
                      }`}
                      aria-pressed={selectedSize === size}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {(product.colors as { name: string; hex: string }[]).map(
                    (color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 transition-all ${
                          selectedColor === color.name
                            ? "border-espresso scale-110"
                            : "border-latte hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                        aria-label={`Select ${color.name}`}
                        aria-pressed={selectedColor === color.name}
                      >
                        {selectedColor === color.name && (
                          <Check className="absolute inset-0 m-auto h-3.5 w-3.5 sm:h-4 sm:w-4 text-white drop-shadow" aria-hidden="true" />
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-5 sm:mt-6">
              <label className="mb-2 block text-sm font-medium text-espresso">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-latte bg-white text-espresso transition-colors hover:bg-latte/20 focus-visible:ring-2 focus-visible:ring-rust"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-10 text-center text-base sm:text-lg font-semibold text-espresso">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-latte bg-white text-espresso transition-colors hover:bg-latte/20 focus-visible:ring-2 focus-visible:ring-rust"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Add to Cart - Desktop */}
            <div className="mt-6 sm:mt-8 hidden sm:block">
              <button
                onClick={handleAddToCart}
                disabled={added || isOutOfStock}
                className={`btn-primary w-full py-4 text-base ${
                  added ? "bg-sage hover:bg-sage" : ""
                } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isOutOfStock ? (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
                    Out of Stock
                  </>
                ) : added ? (
                  <>
                    <Check className="mr-2 h-5 w-5" aria-hidden="true" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
                    Add to Cart — {formatPrice(product.price_cents * quantity)}
                  </>
                )}
              </button>
            </div>

            {/* Inventory indicator */}
            {isOutOfStock ? (
              <p className="mt-3 text-center text-sm font-medium text-mocha">
                Out of stock
              </p>
            ) : isLowStock ? (
              <p className="mt-3 text-center text-sm text-rust">
                Only {product.inventory_count} left in stock
              </p>
            ) : null}

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-latte/20 pt-6">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Truck className="h-5 w-5 text-mocha" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs text-mocha">Free shipping over $50</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Shield className="h-5 w-5 text-mocha" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs text-mocha">Secure checkout</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <RotateCcw className="h-5 w-5 text-mocha" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs text-mocha">30-day returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso">
              You May Also Like
            </h2>
            <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/shop/product/${p.slug}`}
                  className="group rounded-[24px] border border-latte/10 bg-white p-3 sm:p-4 transition-all hover:shadow-hover hover:-translate-y-0.5"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-amber-800 to-stone-900">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        {p.category === "coffee-beans" ? "☕" : "✨"}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 truncate text-sm font-medium text-espresso group-hover:text-rust transition-colors">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-espresso">
                    {formatPrice(p.price_cents)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <ProductReviews productId={product.id} />

        <ImageLightbox
          images={allImages}
          currentIndex={selectedImage}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setSelectedImage}
          alt={product.name}
        />
      </div>

      {/* Sticky Mobile Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-latte/20 bg-cream/95 pb-safe pt-3 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-lg sm:hidden">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-mocha">Total</span>
            <span className="text-lg font-bold text-espresso">
              {formatPrice(product.price_cents * quantity)}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={added || isOutOfStock}
            className={`btn-primary flex-1 py-3 text-base ${
              added ? "bg-sage hover:bg-sage" : ""
            } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isOutOfStock ? (
              <>
                <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
                Out of Stock
              </>
            ) : added ? (
              <>
                <Check className="mr-2 h-5 w-5" aria-hidden="true" />
                Added
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </section>
    </>
  );
}

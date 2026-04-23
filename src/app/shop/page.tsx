"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { Sparkles, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { QuickViewModal } from "@/components/shop/QuickViewModal";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useProducts } from "@/hooks/useProducts";
import type { Product, ProductCategory } from "@/types";

const CATEGORIES: { slug: ProductCategory | "all"; name: string }[] = [
  { slug: "all", name: "All" },
  { slug: "coffee-beans", name: "Coffee" },
  { slug: "merch-apparel", name: "Apparel" },
  { slug: "merch-mugs", name: "Mugs" },
  { slug: "merch-glassware", name: "Glassware" },
  { slug: "merch-accessories", name: "Accessories" },
  { slug: "subscription", name: "Club" },
  { slug: "gift-card", name: "Gifts" },
];

function ProductGrid({ category, onQuickView }: { category: ProductCategory | "all"; onQuickView: (p: Product) => void }) {
  const { products, loading } = useProducts(
    category === "all" ? undefined : { category }
  );

  if (loading) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-latte/20 bg-white"
          >
            <div className="aspect-square rounded-t-2xl bg-latte/20" />
            <div className="p-4 sm:p-5 space-y-3">
              <div className="h-3 w-16 rounded bg-latte/20" />
              <div className="h-5 w-3/4 rounded bg-latte/20" />
              <div className="h-3 w-full rounded bg-latte/20" />
              <div className="h-5 w-16 rounded bg-latte/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 sm:py-20 text-center">
        <p className="text-lg text-mocha">No products found in this category.</p>
        <p className="mt-2 text-sm text-mocha/60">Check back soon — we&apos;re always roasting something new.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
      ))}
    </div>
  );
}

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  return (
    <PullToRefresh onRefresh={async () => window.location.reload()}>
      <section className="section-padding">
        <div className="container-max">
          {/* Header */}
          <div className="mb-8 sm:mb-10 text-center">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso lg:text-5xl">
              Shop Kynda
            </h1>
            <p className="mt-3 text-base sm:text-lg text-mocha">
              Coffee, merch, and custom designs — shipped to your door.
            </p>
          </div>

        {/* Category Filter Tabs - Desktop */}
        <div className="mb-8 hidden sm:flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.slug
                  ? "bg-espresso text-cream"
                  : "bg-latte/20 text-mocha hover:bg-latte/40 hover:text-espresso"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Mobile Filter Toggle */}
        <div className="mb-6 sm:hidden">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-latte/20 bg-white px-4 py-3 text-sm font-medium text-espresso"
            aria-expanded={mobileFilterOpen}
            aria-controls="mobile-filters"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {CATEGORIES.find((c) => c.slug === activeCategory)?.name} Products
            </span>
            <span className="text-xs text-mocha">
              {mobileFilterOpen ? "Close" : "Filter"}
            </span>
          </button>

          {/* Mobile Filter Panel */}
          {mobileFilterOpen && (
            <div id="mobile-filters" className="mt-2 rounded-xl border border-latte/20 bg-white p-3 animate-fade-in-scale">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setActiveCategory(cat.slug);
                      setMobileFilterOpen(false);
                    }}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                      activeCategory === cat.slug
                        ? "bg-espresso text-cream"
                        : "bg-latte/20 text-mocha hover:bg-latte/40"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filter indicator */}
        {activeCategory !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-mocha">
              Showing: <span className="font-medium text-espresso">{CATEGORIES.find((c) => c.slug === activeCategory)?.name}</span>
            </span>
            <button
              onClick={() => setActiveCategory("all")}
              className="flex items-center gap-1 rounded-full bg-latte/20 px-2 py-0.5 text-xs font-medium text-mocha hover:bg-latte/40"
            >
              Clear
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Products Grid */}
        <Suspense fallback={
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-latte/20 bg-white">
                <div className="aspect-square rounded-t-2xl bg-latte/20" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 rounded bg-latte/20" />
                  <div className="h-5 w-3/4 rounded bg-latte/20" />
                  <div className="h-3 w-full rounded bg-latte/20" />
                  <div className="h-5 w-16 rounded bg-latte/20" />
                </div>
              </div>
            ))}
          </div>
        }>
          <ProductGrid category={activeCategory} onQuickView={setQuickViewProduct} />
        </Suspense>

        <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />

        {/* AI Design Studio CTA */}
        <div className="mt-16 sm:mt-20 overflow-hidden rounded-2xl sm:rounded-3xl bg-espresso p-6 sm:p-12 text-center">
          <div className="mx-auto max-w-2xl">
            <Sparkles className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-rust" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl sm:text-3xl font-bold text-cream">
              Want Something Unique?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-latte/70">
              Head to the Design Studio to create your own custom merch with AI.
              Choose your product, browse trends, generate designs, and see them
              come to life.
            </p>
            <Link href="/studio" className="btn-accent mt-6 inline-flex">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Design Studio
            </Link>
          </div>
        </div>
      </div>
    </section>
    </PullToRefresh>
  );
}

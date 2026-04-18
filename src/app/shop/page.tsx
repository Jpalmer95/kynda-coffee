"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import type { ProductCategory } from "@/types";

const CATEGORIES: { slug: ProductCategory | "all"; name: string }[] = [
  { slug: "all", name: "All Products" },
  { slug: "coffee-beans", name: "Coffee Beans" },
  { slug: "merch-apparel", name: "Apparel" },
  { slug: "merch-mugs", name: "Mugs" },
  { slug: "merch-glassware", name: "Glassware" },
  { slug: "merch-accessories", name: "Accessories" },
  { slug: "subscription", name: "Subscriptions" },
];

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
  const { products, loading } = useProducts(
    activeCategory === "all" ? undefined : { category: activeCategory }
  );

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Shop Kynda
          </h1>
          <p className="mt-3 text-lg text-mocha">
            Coffee, merch, and custom designs — shipped to your door.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
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

        {/* Products Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-latte/20 bg-white"
              >
                <div className="aspect-square rounded-t-2xl bg-latte/20" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-16 rounded bg-latte/20" />
                  <div className="h-5 w-3/4 rounded bg-latte/20" />
                  <div className="h-3 w-full rounded bg-latte/20" />
                  <div className="h-5 w-16 rounded bg-latte/20" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-mocha">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* AI Design Studio CTA */}
        <div className="mt-20 overflow-hidden rounded-3xl bg-espresso p-8 text-center sm:p-12">
          <div className="mx-auto max-w-2xl">
            <Sparkles className="mx-auto h-10 w-10 text-rust" />
            <h2 className="mt-4 font-heading text-3xl font-bold text-cream">
              Want Something Unique?
            </h2>
            <p className="mt-3 text-latte/70">
              Head to the Design Studio to create your own custom merch with AI.
              Choose your product, browse trends, generate designs, and see them
              come to life.
            </p>
            <Link href="/studio" className="btn-accent mt-6 inline-flex">
              <Sparkles className="mr-2 h-4 w-4" />
              Open Design Studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types";

const MERCH_CATEGORIES = ["merch-apparel", "merch-mugs", "merch-glassware", "merch-accessories"];

export default function MerchPage() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const { products, loading } = useProducts({
    category: undefined // we'll filter client-side for merch
  });

  const merchProducts = products.filter(p =>
    p.category && MERCH_CATEGORIES.includes(p.category)
  );

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-b from-surface to-surface-800 text-sand py-16 sm:py-24">
        <div className="container-max text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-card/10 px-4 py-1 text-sm mb-4">
            <Sparkles className="h-4 w-4" /> Kynda Originals
          </div>
          <h1 className="font-heading text-5xl sm:text-7xl font-bold tracking-tight">Kynda Merch</h1>
          <p className="mt-4 text-xl text-white/80 max-w-md mx-auto">
            Coffee culture you can wear, drink from, and carry.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#merch-grid" className="btn-primary inline-flex items-center justify-center gap-2">
              Browse Collection
            </a>
          </div>
        </div>
      </div>

      {/* Merch Grid */}
      <section id="merch-grid" className="section-padding bg-cream">
        <div className="container-max">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-heading text-4xl font-bold text-espresso">Trending Merch</h2>
              <p className="text-mocha mt-1">Real photos. Real quality. Ready to ship via Printful.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="animate-pulse rounded-2xl bg-card border border-latte/20 p-4">
                  <div className="aspect-square bg-latte/20 rounded-xl" />
                </div>
              ))}
            </div>
          ) : merchProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-mocha">Merch catalog is being synced from Square.</p>
              <p className="text-sm mt-1 text-mocha/60">Check back shortly or contact us.</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {merchProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

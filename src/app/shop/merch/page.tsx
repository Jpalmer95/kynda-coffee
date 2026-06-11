"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Palette } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types";

const MERCH_CATEGORIES = ["merch-apparel", "merch-mugs", "merch-glassware", "merch-accessories"];

interface CuratedDesign {
  id: string;
  name: string;
  description: string;
  image_url: string;
  style: string;
  product_id: string | null;
}

export default function MerchPage() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [curatedDesigns, setCuratedDesigns] = useState<CuratedDesign[]>([]);

  const { products, loading } = useProducts({ 
    category: undefined // we'll filter client-side for merch
  });

  // Admin-curated designs — surfaced below the regular merch grid
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/studio-designs?shop=1");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.designs)) {
          setCuratedDesigns(data.designs.slice(0, 8));
        }
      } catch {
        /* section simply doesn't render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <Link 
              href="/studio" 
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" /> Design Your Own
            </Link>
            <a href="#merch-grid" className="btn-secondary">
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
            <Link href="/studio" className="hidden sm:flex items-center gap-1 text-sm font-medium text-forest hover:underline">
              Create Custom <ArrowRight className="h-4 w-4" />
            </Link>
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

          {/* Curated studio designs — design-first entry into the studio */}
          {curatedDesigns.length > 0 && (
            <div className="mt-20">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="font-heading text-3xl font-bold text-espresso flex items-center gap-2">
                    <Palette className="h-7 w-7 text-forest" /> Fresh Designs
                  </h2>
                  <p className="text-mocha mt-1">
                    Hand-picked designs — tap one to put it on a tee, mug, hat, or anything else.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {curatedDesigns.map((d) => (
                  <Link
                    key={d.id}
                    href={`/studio?design=${encodeURIComponent(d.id)}`}
                    className="group rounded-2xl bg-card border border-latte/20 overflow-hidden hover:border-forest/40 hover:shadow-lg transition"
                  >
                    <div className="aspect-square bg-white p-4">
                      <img
                        src={d.image_url}
                        alt={d.name}
                        loading="lazy"
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium text-espresso truncate">{d.name}</div>
                      <div className="text-xs text-forest mt-0.5 flex items-center gap-1">
                        Customize it <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-16 text-center">
            <Link href="/studio" className="inline-flex items-center gap-3 rounded-[22px] px-10 py-4 bg-surface hover:bg-surface/80 text-sand transition">
              <Sparkles className="h-5 w-5" /> Start Designing in the Studio
            </Link>
            <p className="text-xs text-mocha/60 mt-2">Mugs, apparel, glassware &amp; more. Ships fast.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

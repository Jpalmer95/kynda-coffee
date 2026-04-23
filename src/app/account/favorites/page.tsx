"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useFavoritesStore } from "@/hooks/useFavorites";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export default function FavoritesPage() {
  const { ids, toggle } = useFavoritesStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const all = (data.products ?? []) as Product[];
        setProducts(all.filter((p) => ids.includes(p.id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ids]);

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Favorites
        </h1>
        <p className="mt-1 text-sm text-mocha">
          Products and designs you&apos;ve saved
        </p>

        {loading ? (
          <div className="mt-8 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-rust" />
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-latte/20 bg-white py-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-latte" aria-hidden="true" />
            <p className="mt-3 text-mocha">No favorites yet</p>
            <p className="mt-1 text-sm text-mocha/70">Heart items while you shop to save them here.</p>
            <Link href="/shop" className="btn-primary mt-4 inline-flex items-center">
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="group flex gap-4 rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md"
              >
                <Link href={`/shop/product/${product.slug}`} className="flex-shrink-0">
                  <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-amber-800 to-stone-900 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg">☕</div>
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/shop/product/${product.slug}`} className="block">
                    <h2 className="font-medium text-espresso group-hover:text-rust transition-colors truncate">
                      {product.name}
                    </h2>
                  </Link>
                  <p className="mt-0.5 text-sm text-mocha line-clamp-1">
                    {product.description}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-espresso">
                    {formatPrice(product.price_cents)}
                  </p>
                </div>
                <button
                  onClick={() => toggle(product.id)}
                  className="flex-shrink-0 self-start rounded-lg p-2 text-mocha transition-colors hover:bg-rust/10 hover:text-rust"
                  aria-label="Remove from favorites"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

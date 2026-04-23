"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, Package, ArrowRight, Coffee } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery.length >= 2) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  async function performSearch(q: string) {
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.products || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) {
      setQuery(inputValue.trim());
      performSearch(inputValue.trim());
      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set("q", inputValue.trim());
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Search
        </h1>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mocha" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search products, coffee, merch..."
              className="input-field w-full pl-12 pr-24 py-4 text-base"
              aria-label="Search query"
            />
            <button
              type="submit"
              disabled={loading || inputValue.length < 2}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-espresso px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-espresso/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {searched && !loading && results.length === 0 && (
          <div className="mt-10 text-center">
            <Package className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg font-medium text-espresso">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-sm text-mocha">
              Try a different keyword or browse our collections.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn-primary">
                Browse Shop
              </Link>
              <Link href="/shop?category=coffee-beans" className="btn-secondary">
                Coffee Beans
              </Link>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-mocha">
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
            {results.map((product) => (
              <Link
                key={product.id}
                href={`/shop/product/${product.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md hover:border-latte/40"
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-800 to-stone-900">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Coffee className="h-6 w-6 text-cream/60" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-espresso truncate group-hover:text-rust transition-colors">
                    {product.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-mocha line-clamp-1">
                    {product.description}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-espresso">
                    {formatPrice(product.price_cents)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-latte group-hover:text-rust transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="section-padding text-center">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import type { ProductCategory } from "@/types";

const CATEGORY_NAMES: Record<string, string> = {
  "coffee-beans": "Coffee Beans",
  "merch-apparel": "Apparel",
  "merch-mugs": "Mugs",
  "merch-glassware": "Glassware",
  "merch-accessories": "Accessories",
  "subscription": "Coffee Club",
  "gift-card": "Gift Cards",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "coffee-beans": "Hand-selected micro-lot organic coffees, freshly roasted in the Texas Hill Country.",
  "merch-apparel": "Comfortable apparel that represents the Kynda lifestyle.",
  "merch-mugs": "Ceramic and glassware for your daily coffee ritual.",
  "merch-glassware": "Elegant glassware for coffee and beyond.",
  "merch-accessories": "Bags, stickers, and accessories for coffee lovers.",
  "subscription": "Never run out of great coffee. Delivered on your schedule.",
  "gift-card": "The perfect gift for any coffee enthusiast.",
};

export default function CategoryPage() {
  const params = useParams();
  const category = params.category as string;
  const validCategory = Object.keys(CATEGORY_NAMES).includes(category)
    ? (category as ProductCategory)
    : null;

  const { products, loading } = useProducts(
    validCategory ? { category: validCategory } : undefined
  );

  const categoryName = validCategory ? CATEGORY_NAMES[category] : "Category";
  const categoryDesc = validCategory
    ? CATEGORY_DESCRIPTIONS[category]
    : "Browse our collections.";

  if (!validCategory) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <h1 className="font-heading text-3xl font-bold text-espresso">Category Not Found</h1>
          <p className="mt-2 text-mocha">We couldn&apos;t find that category.</p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        <Link
          href="/shop"
          className="mb-6 inline-flex items-center gap-1 rounded-lg text-sm text-mocha transition-colors hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shop
        </Link>

        <div className="mb-8 sm:mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
            {categoryName}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-mocha max-w-2xl">
            {categoryDesc}
          </p>
        </div>

        {loading ? (
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
        ) : products.length === 0 ? (
          <div className="py-16 sm:py-20 text-center">
            <Package className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg font-medium text-espresso">No products yet</p>
            <p className="mt-1 text-sm text-mocha">
              We&apos;re restocking soon. Check back later!
            </p>
            <Link href="/shop" className="btn-primary mt-6 inline-flex">
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

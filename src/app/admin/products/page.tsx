"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Search, ExternalLink, Eye, EyeOff, Download } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toCsv, downloadCsv } from "@/lib/export/csv";
import type { Product, ProductCategory } from "@/types";

const CATEGORIES: { value: ProductCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "coffee-beans", label: "Coffee" },
  { value: "merch-apparel", label: "Apparel" },
  { value: "merch-mugs", label: "Mugs" },
  { value: "merch-glassware", label: "Glassware" },
  { value: "merch-accessories", label: "Accessories" },
  { value: "subscription", label: "Club" },
  { value: "gift-card", label: "Gifts" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);
    if (search) params.set("search", search);

    setLoading(true);
    fetch(`/api/admin/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, status, search]);

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
                Products
              </h1>
              <p className="text-sm text-mocha">
                {products.length} products
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const res = await fetch("/api/admin/export/products");
                const data = await res.json();
                if (data.rows) {
                  const csv = toCsv(data.rows);
                  downloadCsv("kynda-products.csv", csv);
                }
              }}
              className="btn-secondary text-sm"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </button>
            <Link href="/admin/products/new" className="btn-primary text-sm w-full sm:w-auto">
              + Add Product
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory | "all")}
              className="select-field text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="select-field text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Products */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-latte/20 bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-latte/20" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-latte/20" />
                    <div className="h-3 w-24 rounded bg-latte/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-latte/20 bg-white py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg text-mocha">No products found</p>
            <p className="text-sm text-mocha/60">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop header */}
            <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 rounded-xl bg-espresso px-4 py-3 text-xs font-medium uppercase tracking-wider text-cream">
              <span className="w-12">Img</span>
              <span>Name</span>
              <span>Category</span>
              <span>Price</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>

            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-latte/20 bg-white p-3 sm:p-4 transition-shadow hover:shadow-md"
              >
                {/* Mobile */}
                <div className="flex items-center gap-3 sm:hidden">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-800 to-stone-900">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg">☕</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-espresso truncate">{product.name}</p>
                    <p className="text-xs text-mocha capitalize">{product.category.replace(/-/g, " ")}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-espresso">{formatPrice(product.price_cents)}</span>
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-sage">
                          <Eye className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-mocha">
                          <EyeOff className="h-3 w-3" /> Hidden
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="rounded-lg p-2 text-xs font-medium text-mocha hover:bg-latte/20"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/shop/product/${product.slug}`}
                      target="_blank"
                      className="rounded-lg p-2 text-mocha hover:bg-latte/20"
                      aria-label="View product"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 items-center">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-gradient-to-br from-amber-800 to-stone-900">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg">☕</div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-espresso truncate">{product.name}</span>
                  <span className="text-sm text-mocha capitalize">{product.category.replace(/-/g, " ")}</span>
                  <span className="text-sm font-semibold text-espresso">{formatPrice(product.price_cents)}</span>
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    product.is_active ? "bg-sage/20 text-sage" : "bg-mocha/10 text-mocha"
                  }`}>
                    {product.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {product.is_active ? "Active" : "Hidden"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
                      aria-label={`Edit ${product.name}`}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/shop/product/${product.slug}`}
                      target="_blank"
                      className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
                      aria-label={`View ${product.name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

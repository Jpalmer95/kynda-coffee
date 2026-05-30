"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, ExternalLink, ImageOff, Loader2, Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product, ProductCategory } from "@/types";

type ProductFilter = "all" | "square" | "online" | "missing-images" | "inactive";

const FILTERS: { value: ProductFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "square", label: "Square / POS" },
  { value: "online", label: "Online / Merch" },
  { value: "missing-images", label: "Missing Images" },
  { value: "inactive", label: "Inactive" },
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  "coffee-beans": "Coffee / Café",
  "merch-apparel": "Apparel",
  "merch-mugs": "Mugs",
  "merch-glassware": "Glassware",
  "merch-accessories": "Accessories",
  "brew-gear": "Brew Gear",
  "bulk-tea": "Loose-Leaf Tea",
  apothecary: "Apothecary",
  "design-studio": "Custom Designs",
  subscription: "Club",
  "gift-card": "Gift Cards",
  catering: "Catering",
};

function imageCount(product: Product) {
  return product.images?.filter(Boolean).length ?? 0;
}

function productSourceLabel(product: Product) {
  if (product.source === "square") return "Square POS";
  if (product.source === "both") return "Square + Online";
  return "Online";
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products?source=all&includePos=true&limit=500", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function syncSquareCatalog() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/square/sync-catalog", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Square catalog sync failed");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Square catalog sync failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.name, product.description, product.slug, product.square_item_id, product.square_variation_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "square" && product.source === "square") ||
        (filter === "online" && product.source !== "square") ||
        (filter === "missing-images" && imageCount(product) === 0) ||
        (filter === "inactive" && !product.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [filter, products, searchTerm]);

  const squareCount = products.filter((product) => product.source === "square").length;
  const missingImageCount = products.filter((product) => imageCount(product) === 0).length;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/10" aria-label="Back to admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold text-espresso">Products</h1>
            <p className="text-sm text-mocha">
              {products.length} products • {squareCount} synced from Square • {missingImageCount} missing images
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={syncSquareCatalog} disabled={syncing} className="btn-secondary text-sm">
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Square Images
          </button>
          <Link href="/admin/catalog" className="btn-secondary text-sm">
            <ExternalLink className="mr-2 h-4 w-4" /> POS Overrides
          </Link>
          <Link href="/admin/products/new" className="btn-primary text-sm">
            <Plus className="mr-2 h-4 w-4" /> Add Online Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-bronze/30 bg-bronze/10 p-4 text-sm text-espresso">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-latte/20 bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
            <input
              type="text"
              placeholder="Search products, Square IDs, descriptions..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  filter === item.value
                    ? "border-surface bg-surface text-sand"
                    : "border-latte/40 bg-card text-espresso hover:bg-latte/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-latte/20 bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading live catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-mocha">
            <Package className="mx-auto h-12 w-12 text-latte" />
            <p className="mt-3 text-lg font-medium text-espresso">No products found</p>
            <p className="text-sm">Try another filter or run a Square sync.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-latte/20 bg-cream text-left text-mocha">
                <tr>
                  <th className="px-4 py-4 font-medium">Product</th>
                  <th className="px-4 py-4 font-medium">Source</th>
                  <th className="px-4 py-4 font-medium">Category</th>
                  <th className="px-4 py-4 text-center font-medium">Images</th>
                  <th className="px-4 py-4 text-center font-medium">Price</th>
                  <th className="px-4 py-4 text-center font-medium">Status</th>
                  <th className="px-4 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {filtered.map((product) => (
                  <tr key={`${product.source}-${product.id}`} className="hover:bg-latte/5">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-cream ring-1 ring-latte/20">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-mocha">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-espresso">{product.name}</div>
                          <div className="max-w-sm truncate text-xs text-mocha">{product.description || product.slug}</div>
                          {product.square_item_id && <div className="text-[11px] text-mocha">Square item: {product.square_item_id}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-mocha">{productSourceLabel(product)}</td>
                    <td className="px-4 py-4 text-mocha">{CATEGORY_LABELS[product.category] ?? product.category}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${imageCount(product) > 0 ? "bg-sage/20 text-sage" : "bg-bronze/10 text-espresso"}`}>
                        {imageCount(product)} image{imageCount(product) === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-espresso">{formatPrice(product.price_cents)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active ? "bg-sage/20 text-sage" : "bg-latte/20 text-mocha"}`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {product.source === "square" ? (
                          <Link href="/admin/catalog" className="rounded-lg p-2 text-mocha hover:bg-latte/20 hover:text-espresso" aria-label="Edit POS override">
                            <Edit className="h-4 w-4" />
                          </Link>
                        ) : (
                          <Link href={`/admin/products/${product.id}/edit`} className="rounded-lg p-2 text-mocha hover:bg-latte/20 hover:text-espresso" aria-label="Edit product">
                            <Edit className="h-4 w-4" />
                          </Link>
                        )}
                        <Link href={`/shop/product/${product.slug}`} className="rounded-lg p-2 text-mocha hover:bg-latte/20 hover:text-espresso" aria-label="View product">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        {product.source !== "square" && (
                          <button className="rounded-lg p-2 text-mocha hover:bg-bronze/10 hover:text-forest" aria-label="Delete product" disabled>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-xs text-mocha">
        Square-owned café items are edited in POS Catalog Overrides so Kynda stays POS-agnostic. Online-only products use the product editor.
      </div>
    </div>
  );
}

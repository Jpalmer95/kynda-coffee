"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ImageIcon, CheckCircle } from "lucide-react";
import type { ProductCategory } from "@/types";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "coffee-beans", label: "Coffee Beans" },
  { value: "merch-apparel", label: "Apparel" },
  { value: "merch-mugs", label: "Mugs" },
  { value: "merch-glassware", label: "Glassware" },
  { value: "merch-accessories", label: "Accessories" },
  { value: "subscription", label: "Subscription" },
  { value: "gift-card", label: "Gift Card" },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("coffee-beans");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [inventory, setInventory] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const priceCents = Math.round(parseFloat(price) * 100);
    if (!priceCents || priceCents <= 0) {
      setError("Please enter a valid price greater than 0");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      category,
      price_cents: priceCents,
      compare_price_cents: comparePrice
        ? Math.round(parseFloat(comparePrice) * 100)
        : null,
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
      inventory_count: inventory ? parseInt(inventory) : 0,
      track_inventory: trackInventory,
      is_active: isActive,
      is_featured: isFeatured,
      source: "online",
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/products");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/products"
            className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20"
            aria-label="Back to products"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
              Add Product
            </h1>
            <p className="text-sm text-mocha">Create a new product listing</p>
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl border border-sage/30 bg-green-50 p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-sage" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-espresso">
              Product created!
            </p>
            <p className="mt-1 text-sm text-mocha">
              Redirecting to product list...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-latte/20 bg-white p-5 sm:p-8"
          >
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-espresso">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-field"
                placeholder="Kynda Espresso Roast"
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="mb-1 block text-sm font-medium text-espresso">
                Slug <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-mocha">
                  (URL-friendly identifier)
                </span>
              </label>
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="input-field font-mono text-sm"
                placeholder="kynda-espresso-roast"
              />
              <p className="mt-1 text-xs text-mocha">
                Will appear as: kynda.coffee/shop/product/{slug || "your-slug"}
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-espresso">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                placeholder="Rich, bold espresso blend with chocolate notes..."
              />
            </div>

            {/* Category & Price */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-espresso">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="select-field"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="price" className="mb-1 block text-sm font-medium text-espresso">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha">$</span>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input-field pl-7"
                    placeholder="19.99"
                  />
                </div>
              </div>
            </div>

            {/* Compare price & Inventory */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="compare" className="mb-1 block text-sm font-medium text-espresso">
                  Compare-at Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha">$</span>
                  <input
                    id="compare"
                    type="number"
                    step="0.01"
                    min="0"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    className="input-field pl-7"
                    placeholder="24.99"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="inventory" className="mb-1 block text-sm font-medium text-espresso">
                  Inventory
                </label>
                <input
                  id="inventory"
                  type="number"
                  min="0"
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Image */}
            <div>
              <label htmlFor="image" className="mb-1 block text-sm font-medium text-espresso">
                Image URL
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
                <input
                  id="image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input-field pl-9"
                  placeholder="https://..."
                />
              </div>
              {imageUrl && (
                <div className="mt-3 h-32 w-32 overflow-hidden rounded-lg border border-latte/20 bg-stone-100">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-3 rounded-xl bg-cream p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Track Inventory</span>
                <input
                  type="checkbox"
                  checked={trackInventory}
                  onChange={(e) => setTrackInventory(e.target.checked)}
                  className="h-5 w-5 accent-rust"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Active</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-5 w-5 accent-rust"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Featured</span>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-5 w-5 accent-rust"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Product"
                )}
              </button>
              <Link
                href="/admin/products"
                className="btn-secondary text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

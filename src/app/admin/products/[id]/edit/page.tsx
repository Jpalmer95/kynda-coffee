"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ImageIcon, CheckCircle, Trash2 } from "lucide-react";
import type { ProductCategory } from "@/types";
import { useToast } from "@/components/ui/Toast";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "coffee-beans", label: "Coffee Beans" },
  { value: "merch-apparel", label: "Apparel" },
  { value: "merch-mugs", label: "Mugs" },
  { value: "merch-glassware", label: "Glassware" },
  { value: "merch-accessories", label: "Accessories" },
  { value: "subscription", label: "Subscription" },
  { value: "gift-card", label: "Gift Card" },
];

function centsToDollars(cents: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setLoading(false);
          return;
        }
        const p = d.product;
        setName(p.name ?? "");
        setSlug(p.slug ?? "");
        setDescription(p.description ?? "");
        setCategory(p.category ?? "coffee-beans");
        setPrice(centsToDollars(p.price_cents));
        setComparePrice(centsToDollars(p.compare_price_cents));
        setInventory(p.inventory_count != null ? String(p.inventory_count) : "");
        setTrackInventory(p.track_inventory ?? true);
        setIsActive(p.is_active ?? true);
        setIsFeatured(p.is_featured ?? false);
        setImageUrl(p.images?.[0] ?? "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load product");
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const priceCents = Math.round(parseFloat(price) * 100);
    if (!priceCents || priceCents <= 0) {
      setError("Please enter a valid price greater than 0");
      setSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      category,
      price_cents: priceCents,
      compare_price_cents: comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null,
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
      inventory_count: inventory ? parseInt(inventory) : 0,
      track_inventory: trackInventory,
      is_active: isActive,
      is_featured: isFeatured,
    };

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      setSuccess(true);
      toast("Product updated successfully", "success");
      setTimeout(() => router.push("/admin/products"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Product deleted", "success");
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-max max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-latte/20" />
          <div className="h-96 rounded-2xl bg-latte/20" />
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin/products" className="rounded-lg p-2 text-mocha hover:bg-latte/20" aria-label="Back">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">Edit Product</h1>
            <p className="text-sm text-mocha">Update product details</p>
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl border border-sage/30 bg-green-50 p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-sage" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-espresso">Product updated!</p>
            <p className="mt-1 text-sm text-mocha">Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-latte/20 bg-white p-5 sm:p-8">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-espresso">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
            </div>

            <div>
              <label htmlFor="slug" className="mb-1 block text-sm font-medium text-espresso">
                Slug <span className="text-red-500">*</span>
              </label>
              <input id="slug" type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} className="input-field font-mono text-sm" />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-espresso">Description</label>
              <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-field resize-none" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-espresso">Category <span className="text-red-500">*</span></label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="select-field">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="price" className="mb-1 block text-sm font-medium text-espresso">Price <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha">$</span>
                  <input id="price" type="number" step="0.01" min="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} className="input-field pl-7" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="compare" className="mb-1 block text-sm font-medium text-espresso">Compare-at Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha">$</span>
                  <input id="compare" type="number" step="0.01" min="0" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} className="input-field pl-7" />
                </div>
              </div>
              <div>
                <label htmlFor="inventory" className="mb-1 block text-sm font-medium text-espresso">Inventory</label>
                <input id="inventory" type="number" min="0" value={inventory} onChange={(e) => setInventory(e.target.value)} className="input-field" />
              </div>
            </div>

            <div>
              <label htmlFor="image" className="mb-1 block text-sm font-medium text-espresso">Image URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
                <input id="image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input-field pl-9" placeholder="https://..." />
              </div>
              {imageUrl && (
                <div className="mt-3 h-32 w-32 overflow-hidden rounded-lg border border-latte/20 bg-stone-100">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl bg-cream p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Track Inventory</span>
                <input type="checkbox" checked={trackInventory} onChange={(e) => setTrackInventory(e.target.checked)} className="h-5 w-5 accent-rust" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Active</span>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 accent-rust" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-espresso">Featured</span>
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-5 w-5 accent-rust" />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
              <Link href="/admin/products" className="btn-secondary text-center">Cancel</Link>
            </div>

            <div className="border-t border-latte/20 pt-4">
              <button type="button" onClick={handleDelete} disabled={deleting} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete Product</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

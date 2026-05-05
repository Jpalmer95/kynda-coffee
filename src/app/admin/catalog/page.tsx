"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type CatalogItem = {
  id: string;
  provider: string;
  providerItemId: string;
  name: string;
  description: string;
  categoryName: string;
  itemType: string;
  availableOnline: boolean;
  availablePickup: boolean;
  availableDelivery: boolean;
  availableShipping: boolean;
  availableQr: boolean;
  imageUrls: string[];
  priceCents: number;
  priceLabel: string;
  variations: { id: string; name: string; providerVariationId: string; priceCents: number; priceLabel: string }[];
};

type Override = {
  provider: string;
  provider_item_id: string;
  provider_variation_id: string | null;
  display_name: string | null;
  display_description: string | null;
  image_urls: string[] | null;
  category_name: string | null;
  item_type: string | null;
  available_online: boolean | null;
  available_pickup: boolean | null;
  available_delivery: boolean | null;
  available_shipping: boolean | null;
  available_qr: boolean | null;
  is_hidden: boolean;
  is_featured: boolean | null;
  sort_order: number | null;
  menu_metrics_recipe_id: string | null;
  admin_notes: string | null;
};

const CHANNELS = [
  { key: "available_online", itemKey: "availableOnline", label: "Online" },
  { key: "available_pickup", itemKey: "availablePickup", label: "Pickup" },
  { key: "available_qr", itemKey: "availableQr", label: "QR" },
  { key: "available_delivery", itemKey: "availableDelivery", label: "Delivery" },
  { key: "available_shipping", itemKey: "availableShipping", label: "Shipping" },
] as const;

const ITEM_TYPES = ["menu", "retail", "merch", "modifier", "service", "gift_card", "unknown"];

function defaultOverride(item: CatalogItem): Override {
  return {
    provider: item.provider,
    provider_item_id: item.providerItemId,
    provider_variation_id: null,
    display_name: null,
    display_description: null,
    image_urls: null,
    category_name: null,
    item_type: null,
    available_online: null,
    available_pickup: null,
    available_delivery: null,
    available_shipping: null,
    available_qr: null,
    is_hidden: false,
    is_featured: null,
    sort_order: null,
    menu_metrics_recipe_id: null,
    admin_notes: null,
  };
}

function overrideKey(provider: string, providerItemId: string) {
  return `${provider}:${providerItemId}:`;
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function AdminCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadCatalog() {
    setLoading(true);
    const params = new URLSearchParams({ channel });
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/catalog?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    const map: Record<string, Override> = {};
    for (const override of data.overrides ?? []) {
      map[overrideKey(override.provider, override.provider_item_id)] = override;
    }
    setOverrides(map);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(loadCatalog, 250);
    return () => clearTimeout(timeout);
  }, [search, channel]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => typeFilter === "all" || item.itemType === typeFilter);
  }, [items, typeFilter]);

  function getOverride(item: CatalogItem) {
    return overrides[overrideKey(item.provider, item.providerItemId)] ?? defaultOverride(item);
  }

  function updateOverride(item: CatalogItem, patch: Partial<Override>) {
    const key = overrideKey(item.provider, item.providerItemId);
    setOverrides((current) => ({
      ...current,
      [key]: { ...getOverride(item), ...patch },
    }));
  }

  async function saveOverride(item: CatalogItem) {
    const key = overrideKey(item.provider, item.providerItemId);
    const override = getOverride(item);
    setSavingKey(key);

    const res = await fetch("/api/admin/catalog/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(override),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.details || data.error || "Failed to save override");
    } else {
      await loadCatalog();
    }
    setSavingKey(null);
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">POS Catalog Overrides</h1>
              <p className="text-sm text-mocha">Curate what Square items appear on menu, QR ordering, shop, delivery, and shipping channels.</p>
            </div>
          </div>
          <button onClick={loadCatalog} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-latte/20 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search live POS catalog..."
                className="input-field pl-9 text-sm"
              />
            </div>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="select-field text-sm">
              <option value="all">All channels</option>
              <option value="menu">Public menu</option>
              <option value="qr">QR ordering</option>
              <option value="pickup">Pickup</option>
              <option value="shop">Shop</option>
              <option value="shipping">Shipping</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="select-field text-sm">
              <option value="all">All types</option>
              {ITEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-latte/20 bg-white py-20 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading POS catalog...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-latte/20 bg-white py-20 text-center text-mocha">
            No catalog items found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const override = getOverride(item);
              const key = overrideKey(item.provider, item.providerItemId);
              const isExpanded = expanded === key;
              const hidden = override.is_hidden;

              return (
                <article key={key} className="rounded-2xl border border-latte/20 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-lg font-bold text-espresso">{override.display_name || item.name}</h2>
                        <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs text-mocha">{override.item_type || item.itemType}</span>
                        <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-mocha">{override.category_name || item.categoryName}</span>
                        {hidden ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Hidden</span> : null}
                        {override.is_featured ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Featured</span> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-mocha">{override.display_description || item.description || "No public description"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-mocha/70">
                        <span>{item.priceLabel}</span>
                        <span>•</span>
                        <span>{item.variations.length} variation{item.variations.length === 1 ? "" : "s"}</span>
                        <span>•</span>
                        <span>{item.providerItemId}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateOverride(item, { is_hidden: !hidden })}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${hidden ? "bg-red-50 text-red-700" : "bg-sage/20 text-sage"}`}
                      >
                        {hidden ? <EyeOff className="mr-1 inline h-3 w-3" /> : <Eye className="mr-1 inline h-3 w-3" />}
                        {hidden ? "Hidden" : "Visible"}
                      </button>
                      <button
                        onClick={() => updateOverride(item, { is_featured: !override.is_featured })}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${override.is_featured ? "bg-amber-50 text-amber-700" : "bg-latte/20 text-mocha"}`}
                      >
                        <Star className="mr-1 inline h-3 w-3" /> Featured
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : key)} className="rounded-full bg-latte/20 px-3 py-1.5 text-xs font-medium text-mocha">
                        <SlidersHorizontal className="mr-1 inline h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => saveOverride(item)} disabled={savingKey === key} className="rounded-full bg-espresso px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-50">
                        {savingKey === key ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Save className="mr-1 inline h-3 w-3" />}
                        Save
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 grid gap-4 border-t border-latte/20 pt-4 lg:grid-cols-2">
                      <label className="block text-sm font-medium text-espresso">
                        Display name
                        <input value={override.display_name ?? ""} onChange={(e) => updateOverride(item, { display_name: nullableText(e.target.value) })} className="input-field mt-1 text-sm" placeholder={item.name} />
                      </label>
                      <label className="block text-sm font-medium text-espresso">
                        Public category
                        <input value={override.category_name ?? ""} onChange={(e) => updateOverride(item, { category_name: nullableText(e.target.value) })} className="input-field mt-1 text-sm" placeholder={item.categoryName} />
                      </label>
                      <label className="block text-sm font-medium text-espresso lg:col-span-2">
                        Public description
                        <textarea value={override.display_description ?? ""} onChange={(e) => updateOverride(item, { display_description: nullableText(e.target.value) })} className="input-field mt-1 min-h-20 text-sm" placeholder={item.description || "Add a customer-friendly description"} />
                      </label>
                      <label className="block text-sm font-medium text-espresso">
                        Item type
                        <select value={override.item_type ?? ""} onChange={(e) => updateOverride(item, { item_type: nullableText(e.target.value) })} className="select-field mt-1 text-sm">
                          <option value="">Use synced: {item.itemType}</option>
                          {ITEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-espresso">
                        Sort order
                        <input type="number" value={override.sort_order ?? ""} onChange={(e) => updateOverride(item, { sort_order: e.target.value === "" ? null : Number(e.target.value) })} className="input-field mt-1 text-sm" placeholder="Optional" />
                      </label>
                      <label className="block text-sm font-medium text-espresso">
                        Image URL
                        <input value={override.image_urls?.[0] ?? ""} onChange={(e) => updateOverride(item, { image_urls: nullableText(e.target.value) ? [e.target.value.trim()] : null })} className="input-field mt-1 text-sm" placeholder={item.imageUrls[0] || "https://..."} />
                      </label>
                      <label className="block text-sm font-medium text-espresso">
                        MenuMetrics recipe ID
                        <input value={override.menu_metrics_recipe_id ?? ""} onChange={(e) => updateOverride(item, { menu_metrics_recipe_id: nullableText(e.target.value) })} className="input-field mt-1 text-sm" placeholder="Future recipe link" />
                      </label>

                      <div className="lg:col-span-2">
                        <p className="mb-2 text-sm font-medium text-espresso">Channel overrides</p>
                        <div className="flex flex-wrap gap-2">
                          {CHANNELS.map((field) => {
                            const current = override[field.key];
                            const synced = item[field.itemKey];
                            return (
                              <button
                                key={field.key}
                                type="button"
                                onClick={() => updateOverride(item, { [field.key]: current === true ? false : current === false ? null : true } as Partial<Override>)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium ${current === true ? "bg-sage/20 text-sage" : current === false ? "bg-red-50 text-red-700" : "bg-latte/20 text-mocha"}`}
                                title="Click cycles: inherit → yes → no → inherit"
                              >
                                {field.label}: {current === null ? `inherit ${synced ? "on" : "off"}` : current ? "on" : "off"}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="block text-sm font-medium text-espresso lg:col-span-2">
                        Admin notes
                        <textarea value={override.admin_notes ?? ""} onChange={(e) => updateOverride(item, { admin_notes: nullableText(e.target.value) })} className="input-field mt-1 min-h-16 text-sm" placeholder="Internal notes for this catalog item" />
                      </label>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

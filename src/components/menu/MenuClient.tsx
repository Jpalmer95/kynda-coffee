"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, SlidersHorizontal, X, Coffee } from "lucide-react";
import type { PosCatalogCategoryGroup, PosCatalogItem } from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
import { MenuItemDialog } from "./MenuItemDialog";
import { useMenuCartStore } from "@/hooks/useMenuCart";

interface MenuClientProps {
  categories: PosCatalogCategoryGroup[];
  generatedAt: string;
}

export function MenuClient({ categories, generatedAt }: MenuClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<PosCatalogItem | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const { items, item_count, subtotal_cents, updateQuantity, removeItem } = useMenuCartStore();

  const allCategoryNames = categories.map((c) => c.name);
  const activeCategories =
    activeCategory === "all"
      ? categories
      : categories.filter((c) => c.name === activeCategory);

  return (
    <div className="mt-10">
      {/* Category Filter Tabs - Desktop */}
      <div className="mb-6 hidden flex-wrap items-center justify-center gap-2 sm:flex">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "bg-surface text-sand"
              : "bg-latte/20 text-mocha hover:bg-latte/40 hover:text-espresso"
          }`}
        >
          All
        </button>
        {allCategoryNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveCategory(name)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === name
                ? "bg-surface text-sand"
                : "bg-latte/20 text-mocha hover:bg-latte/40 hover:text-espresso"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Mobile Filter Toggle */}
      <div className="mb-6 sm:hidden">
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-latte/20 bg-card px-4 py-3 text-sm font-medium text-espresso"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {activeCategory === "all" ? "All Categories" : activeCategory}
          </span>
          <span className="text-xs text-mocha">
            {mobileFilterOpen ? "Close" : "Filter"}
          </span>
        </button>
        {mobileFilterOpen && (
          <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-latte/20 bg-card p-3 animate-fade-in-scale">
            <button
              onClick={() => { setActiveCategory("all"); setMobileFilterOpen(false); }}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                activeCategory === "all"
                  ? "bg-surface text-sand"
                  : "bg-latte/20 text-mocha hover:bg-latte/40"
              }`}
            >
              All
            </button>
            {allCategoryNames.map((name) => (
              <button
                key={name}
                onClick={() => { setActiveCategory(name); setMobileFilterOpen(false); }}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                  activeCategory === name
                    ? "bg-surface text-sand"
                    : "bg-latte/20 text-mocha hover:bg-latte/40"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filter indicator */}
      {activeCategory !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-mocha">
            Showing: <span className="font-medium text-espresso">{activeCategory}</span>
          </span>
          <button
            onClick={() => setActiveCategory("all")}
            className="flex items-center gap-1 rounded-full bg-latte/20 px-2 py-0.5 text-xs font-medium text-mocha hover:bg-latte/40"
          >
            Clear <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Menu Grid */}
      <div className="space-y-10">
        {activeCategories.map((category) => (
          <div key={category.name}>
            <h2 className="mb-4 font-heading text-2xl font-bold tracking-tight text-espresso">
              {category.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => (
                <button
                  key={item.providerItemId}
                  onClick={() => setSelectedItem(item)}
                  className="group relative block overflow-hidden rounded-2xl border border-latte/20 bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-forest"
                >
                  {/* Image */}
                  {item.imageUrls.length > 0 ? (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={item.imageUrls[0]}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-latte/10">
                      <Coffee className="h-12 w-12 text-latte" />
                    </div>
                  )}

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-lg font-semibold text-espresso transition-colors group-hover:text-forest line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-mocha">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-lg font-bold text-espresso">
                          {item.priceLabel}
                        </span>
                        {item.variations.length > 1 && (
                          <p className="text-[11px] text-mocha">from {formatMoney(item.priceCents)}</p>
                        )}
                      </div>
                    </div>

                    {/* Modifiers hint */}
                    {item.modifierLists.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.modifierLists.slice(0, 2).map((list) => (
                          <span
                            key={list.providerModifierListId}
                            className="rounded-full bg-latte/20 px-2 py-0.5 text-[11px] text-mocha"
                          >
                            {list.name}
                          </span>
                        ))}
                        {item.modifierLists.length > 2 && (
                          <span className="rounded-full bg-latte/20 px-2 py-0.5 text-[11px] text-mocha">
                            +{item.modifierLists.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {activeCategories.length === 0 && (
        <div className="py-20 text-center">
          <Coffee className="mx-auto h-12 w-12 text-latte" />
          <p className="mt-4 text-lg text-mocha">No items in this category right now.</p>
          <p className="mt-1 text-sm text-mocha/60">Check back soon — we&apos;re always brewing something new.</p>
        </div>
      )}

      <MenuItemDialog item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Floating Cart Button */}
      {item_count > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-3xl bg-surface px-5 py-3 font-semibold text-sand shadow-xl transition-transform hover:scale-105 active:scale-95"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>
            {item_count} item{item_count !== 1 ? "s" : ""} · {formatMoney(subtotal_cents)}
          </span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setShowCart(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col overflow-auto bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-latte/20 px-5 py-4">
              <h2 className="font-heading text-xl font-semibold text-espresso">
                Your Cart ({item_count})
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingCart className="h-10 w-10 text-latte" />
                  <p className="mt-3 text-mocha">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((line) => (
                    <div
                      key={line.id}
                      className="flex gap-3 rounded-xl border border-latte/20 bg-cream p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-espresso">
                          {line.itemName}
                          {line.variationName && line.variationName !== "Regular" && (
                            <span className="text-mocha"> — {line.variationName}</span>
                          )}
                        </div>
                        {line.modifierNames.length > 0 && (
                          <div className="mt-0.5 text-xs text-mocha">
                            {line.modifierNames.join(", ")}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(line.id, line.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-latte bg-card text-espresso hover:bg-latte/20"
                          >
                            <span className="text-sm">−</span>
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(line.id, line.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-latte bg-card text-espresso hover:bg-latte/20"
                          >
                            <span className="text-sm">+</span>
                          </button>
                          <button
                            onClick={() => removeItem(line.id)}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-mocha hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-sm font-semibold text-espresso">
                          {formatMoney(line.unitPriceCents * line.quantity)}
                        </div>
                        <div className="text-xs text-mocha">
                          {formatMoney(line.unitPriceCents)} ea
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-latte/20 bg-card px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-mocha">Subtotal</span>
                  <span className="text-lg font-bold text-espresso">
                    {formatMoney(subtotal_cents)}
                  </span>
                </div>
                <a
                  href="/order"
                  className="btn-accent mt-4 flex w-full items-center justify-center py-3 text-base"
                >
                  Go to Order Page
                </a>
                <p className="mt-2 text-center text-[11px] text-mocha">
                  You&apos;ll enter your name and payment details on the order page.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

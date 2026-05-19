"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, SlidersHorizontal, X, Coffee, Minus, Plus } from "lucide-react";
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
    <div className="mt-10 max-w-[1280px] mx-auto px-4 sm:px-6">
      {/* Category Filter Tabs - Desktop */}
      <div className="mb-6 hidden flex-wrap items-center justify-center gap-3 sm:flex">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "bg-forest/10 border border-forest text-forest dark:text-forest-400 font-bold"
              : "bg-surface/5 border border-latte/10 text-mocha hover:bg-surface/10 hover:text-espresso"
          }`}
        >
          All
        </button>
        {allCategoryNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveCategory(name)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              activeCategory === name
                ? "bg-forest/10 border border-forest text-forest dark:text-forest-400 font-bold"
                : "bg-surface/5 border border-latte/10 text-mocha hover:bg-surface/10 hover:text-espresso"
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
                  className="group relative flex flex-col overflow-hidden rounded-[12px] border border-latte/70 bg-card text-left shadow-sm transition-all hover:shadow-hover hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-forest dark:border-[#2f372f]/40 dark:shadow-[0_0_15px_rgba(74,222,128,0)] dark:hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                >
                  {item.imageUrls.length > 0 ? (
                    <div className="relative aspect-square overflow-hidden bg-[#121513]">
                      <Image
                        src={item.imageUrls[0]}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      {/* Price Badge Overlay */}
                      <div className="absolute right-3 top-3 rounded bg-surface/90 px-3 py-1 font-body text-sm font-bold tracking-widest text-sand shadow-sm backdrop-blur-sm border border-latte/10">
                        {item.priceLabel}
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex aspect-square items-center justify-center bg-[#121513]">
                      <Coffee className="h-12 w-12 text-latte" />
                      <div className="absolute right-3 top-3 rounded bg-surface/90 px-3 py-1 font-body text-sm font-bold tracking-widest text-sand shadow-sm backdrop-blur-sm border border-latte/10">
                        {item.priceLabel}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col flex-1 p-4 sm:p-5 h-full">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-bold text-espresso transition-colors group-hover:text-forest line-clamp-1">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-mocha">
                          {item.description}
                        </p>
                      )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-latte/30">
                        <div className="flex items-center justify-between">
                           {item.variations.length > 1 ? (
                            <span className="text-[11px] font-body uppercase tracking-[0.05em] text-[#869486]">Customizable</span>
                           ) : <span className="text-[11px] font-body uppercase tracking-[0.05em] text-transparent select-none">Fixed</span>}
                           
                           <span className="rounded-[4px] border border-forest/80 px-4 py-1.5 text-sm font-bold text-forest transition-colors group-hover:bg-forest/10 dark:hover:shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                             + ADD
                           </span>
                        </div>
                      </div>
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
          className="fixed inset-0 z-50 flex justify-end bg-surface-800/40 backdrop-blur-sm"
          onClick={() => setShowCart(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col overflow-auto bg-card shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-latte/20 px-5 py-6">
              <h2 className="font-heading text-2xl font-bold text-espresso">
                Current Order
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="rounded-full p-2 text-mocha hover:bg-latte/20 hover:text-espresso"
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
                      className="flex gap-4 rounded-xl border border-latte/10 bg-cream p-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-heading text-lg font-bold text-espresso">
                          {line.itemName}
                          {line.variationName && line.variationName !== "Regular" && (
                            <span className="text-mocha font-body text-sm font-medium"> — {line.variationName}</span>
                          )}
                        </div>
                        {line.modifierNames.length > 0 && (
                          <div className="mt-1 text-sm text-mocha line-clamp-2">
                            {line.modifierNames.join(", ")}
                          </div>
                        )}
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center rounded-lg border border-latte/40 bg-card p-0.5">
                            <button
                              onClick={() => updateQuantity(line.id, line.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-espresso hover:bg-latte/20"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-espresso">
                              {line.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(line.id, line.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-espresso hover:bg-latte/20"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(line.id)}
                            className="text-sm font-bold text-mocha transition-colors hover:text-red-600 underline decoration-latte/40 underline-offset-4"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-base font-bold text-espresso">
                          {formatMoney(line.unitPriceCents * line.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-latte/20 bg-surface px-5 py-6 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base text-sand/80">Subtotal</span>
                  <span className="text-xl font-bold text-sand">
                    {formatMoney(subtotal_cents)}
                  </span>
                </div>
                <a
                  href="/order"
                  className="btn-accent mt-2 flex w-full items-center justify-center py-4 text-base tracking-wide"
                >
                  PROCEED TO CHECKOUT &rarr;
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

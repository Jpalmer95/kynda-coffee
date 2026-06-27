"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useCartStore } from "@/hooks/useCart";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ProductImage } from "@/components/shop/ProductImage";
import { loadStripe } from "@stripe/stripe-js";
import { formatMoney } from "@/lib/pos/catalog";
import { formatPrice } from "@/lib/utils";
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from "lucide-react";
import { useMenuCartStore } from "@/hooks/useMenuCart";

export function CartDrawer() {
  const { open, setOpen } = useCartDrawer();
  const { items: shopItems, subtotal_cents: shopSubtotal, item_count: shopCount, updateQuantity: updateShopQty, removeItem: removeShopItem } = useCartStore();
  const { items: menuItems, subtotal_cents: menuSubtotal, item_count: menuCount, updateQuantity: updateMenuQty, removeItem: removeMenuItem } = useMenuCartStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(open);
  const touchStartX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

          const item_count = shopCount + menuCount;
  const totalSubtotal = shopSubtotal + menuSubtotal;

  // Track scroll for drawer locking behavior
  const [scrollLock, setScrollLock] = useState(false);

  // Force closed on mount — ensures it never opens by default on page load
  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  // Close on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Touch swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!open) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    if (diff > 0) {
      setSwipeOffset(diff);
    }
  }, [open]);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > 120) {
      setOpen(false);
    }
    setSwipeOffset(0);
  }, [swipeOffset, setOpen]);

  const transformStyle = open ? `translateX(${swipeOffset}px)` : `translateX(calc(100% + 16px))`;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-surface/40 backdrop-blur-sm transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={trapRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-surface-sidebar shadow-[0_0_40px_rgba(0,0,0,0.5)] border-l border-latte transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] touch-pan-y ${
          open ? "" : "translate-x-full"
        }`}
        style={{ transform: transformStyle }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
      {/* Draw Layering (from standard UI) */}
      <div className="flex h-full flex-col bg-surface shadow-2xl relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-latte/70 px-4 py-6 sm:px-6 relative z-10 glass-nav glass-nav-border">
            <h2 className="font-heading text-2xl font-bold text-espresso tracking-tight">
              Current Order ({item_count})
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="rounded-[4px] p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso border border-latte/40 bg-card"
              aria-label="Close cart"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {shopItems.length === 0 && menuItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag className="h-12 w-12 text-latte" />
                <p className="mt-4 font-medium text-espresso">Your cart is empty</p>
                <p className="mt-1 text-sm text-mocha">Browse our shop or menu and add something you love.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-6"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Shop Items */}
                {shopItems.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-mocha">Shop</h3>
                    <div className="space-y-4">
                      {shopItems.map((item) => (
                        <div
                          key={`${item.product.id}-${JSON.stringify(item.selectedVariant)}`}
                          className="flex gap-4 rounded-[12px] border border-latte/70 bg-card p-4 shadow-sm transition-all dark:border-latte/40"
                        >
                          <Link
                            href={`/shop/product/${item.product.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex-shrink-0"
                          >
                            <ProductImage product={item.product} className="h-20 w-20 rounded-lg" sizes="80px" />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/shop/product/${item.product.slug}`}
                              onClick={() => setOpen(false)}
                              className="block truncate font-heading text-lg font-bold text-espresso hover:text-forest dark:text-sand dark:hover:text-forest"
                            >
                              {item.product.name}
                            </Link>
                        {item.selectedVariant && (
                          <div className="mt-2 text-[11px] text-forest font-bold tracking-widest uppercase opacity-90 line-clamp-1">
                            {item.selectedVariant.size && <span>{item.selectedVariant.size}</span>}
                            {item.selectedVariant.grind && <span>{item.selectedVariant.size ? " • " : ""}{item.selectedVariant.grind.replace(/-/g, " ")}</span>}
                            {item.selectedVariant.color && <span>{(item.selectedVariant.size || item.selectedVariant.grind) ? " • " : ""}{item.selectedVariant.color}</span>}
                          </div>
                        )}

                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center rounded-[4px] border border-latte/40 bg-card p-0.5">
                                {item.quantity === 1 ? (
                                  <button
                                    onClick={() => removeShopItem(item.product.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-mocha hover:text-red-600 hover:bg-latte/20"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateShopQty(item.product.id, item.quantity - 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-espresso hover:bg-latte/20"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                )}
                                <span className="w-8 text-center text-sm font-bold text-espresso">{item.quantity}</span>
                                <button
                                  onClick={() => updateShopQty(item.product.id, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-[4px] text-espresso hover:bg-latte/20"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex gap-2">
                        <span className="font-mono text-base font-bold text-forest">
                          {formatPrice(item.product.price_cents * item.quantity)}
                        </span>
                          </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu Items */}
                {menuItems.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-mocha">Menu</h3>
                    <div className="space-y-4">
                      {menuItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 rounded-[12px] border border-latte/70 bg-card p-4 shadow-sm transition-all dark:border-latte/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-heading text-lg font-bold text-espresso dark:text-sand">
                              {item.itemName}
                              {item.variationName && item.variationName !== "Regular" && (
                                <span className="text-mocha font-body text-sm font-medium"> — {item.variationName}</span>
                              )}
                            </div>
                            {item.modifierNames.length > 0 && (
                              <div className="mt-2 text-[11px] uppercase tracking-wider font-bold text-forest dark:text-forest-300 opacity-90 line-clamp-2">
                                {item.modifierNames.join(" • ")}
                              </div>
                            )}

                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center rounded-[4px] border border-latte/40 bg-card p-0.5">
                                {item.quantity === 1 ? (
                                  <button
                                    onClick={() => removeMenuItem(item.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-mocha hover:text-red-600 hover:bg-latte/20"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateMenuQty(item.id, item.quantity - 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-espresso hover:bg-latte/20"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                )}
                                <span className="w-8 text-center text-sm font-bold text-espresso">{item.quantity}</span>
                                <button
                                  onClick={() => updateMenuQty(item.id, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-[4px] text-espresso hover:bg-latte/20"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                                  <div className="flex gap-2">
                        <span className="font-mono text-base font-bold text-forest">
                          {formatPrice(item.unitPriceCents * item.quantity)}
                        </span>
                          </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {(shopItems.length > 0 || menuItems.length > 0) && (
            <div className="border-t border-latte bg-[cream] px-4 py-6 sm:px-6 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-base text-mocha font-body tracking-[0.05em] uppercase">Subtotal</span>
                  <span className="font-heading text-2xl font-bold tracking-tight text-forest">{formatPrice(totalSubtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-latte-500 mb-2">Shipping & taxes calculated at checkout</p>

              {shopItems.length > 0 && (
                <Link
                  href="/shop/cart"
                  onClick={() => setOpen(false)}
                  className="btn-accent mt-3 flex w-full items-center justify-center py-4 text-sm font-bold uppercase tracking-[0.05em] rounded-[4px] border border-forest-300/30"
                >
                  Shop Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}

              {menuItems.length > 0 && (
                  <Link
                  href="/order"
                  onClick={() => setOpen(false)}
                  className={`flex w-full items-center justify-center py-4 text-sm font-bold uppercase tracking-[0.05em] rounded-[4px] transition-colors ${
                    shopItems.length > 0
                      ? "btn-secondary mt-2 bg-transparent text-mocha border-latte hover:bg-forest/10 hover:text-forest hover:border-forest/30"
                      : "btn-accent mt-3 border border-forest-300/30"
                  }`}
                >
                  Review &amp; Pay
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

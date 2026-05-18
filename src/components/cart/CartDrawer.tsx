"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useCartStore } from "@/hooks/useCart";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/shop/ProductImage";
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
      {/* Floating cart button (mobile) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-sand shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
        aria-label={`Open cart (${item_count} items)`}
      >
        <ShoppingBag className="h-5 w-5" />
        {item_count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-bronze text-[10px] font-bold text-white">
            {item_count > 9 ? "9+" : item_count}
          </span>
        )}
      </button>

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
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-cream shadow-2xl transition-transform duration-300 ease-out touch-pan-y ${
          open ? "" : "translate-x-full"
        }`}
        style={{ transform: transformStyle }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-latte/20 px-4 py-4 sm:px-6">
            <h2 className="font-heading text-lg font-semibold text-espresso">
              Your Cart ({item_count})
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
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
                          className="flex gap-3 rounded-xl border border-latte/20 bg-card p-3"
                        >
                          <Link
                            href={`/shop/product/${item.product.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex-shrink-0"
                          >
                            <ProductImage product={item.product} className="h-16 w-16 rounded-lg" sizes="64px" />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/shop/product/${item.product.slug}`}
                              onClick={() => setOpen(false)}
                              className="block truncate text-sm font-medium text-espresso hover:text-forest"
                            >
                              {item.product.name}
                            </Link>
                            <div className="mt-0.5 text-xs text-mocha">
                              {item.selectedVariant?.size && <span>Size: {item.selectedVariant.size} · </span>}
                              {item.selectedVariant?.grind && <span>{item.selectedVariant.grind.replace(/-/g, " ")} · </span>}
                              {item.selectedVariant?.color && <span>{item.selectedVariant.color}</span>}
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {item.quantity === 1 ? (
                                  <button
                                    onClick={() => removeShopItem(item.product.id)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-mocha hover:text-red-600 hover:bg-red-50"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateShopQty(item.product.id, item.quantity - 1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-espresso hover:bg-latte/20"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateShopQty(item.product.id, item.quantity + 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-espresso hover:bg-latte/20"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="text-sm font-semibold text-espresso">
                                {formatPrice(item.product.price_cents * item.quantity)}
                              </span>
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
                          className="flex gap-3 rounded-xl border border-latte/20 bg-card p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-espresso">
                              {item.itemName}
                              {item.variationName && item.variationName !== "Regular" && (
                                <span className="text-mocha"> — {item.variationName}</span>
                              )}
                            </div>
                            {item.modifierNames.length > 0 && (
                              <div className="mt-0.5 text-xs text-mocha">{item.modifierNames.join(", ")}</div>
                            )}

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {item.quantity === 1 ? (
                                  <button
                                    onClick={() => removeMenuItem(item.id)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-mocha hover:text-red-600 hover:bg-red-50"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateMenuQty(item.id, item.quantity - 1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-espresso hover:bg-latte/20"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateMenuQty(item.id, item.quantity + 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-espresso hover:bg-latte/20"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="text-sm font-semibold text-espresso">
                                {formatPrice(item.unitPriceCents * item.quantity)}
                              </span>
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
            <div className="border-t border-latte/20 bg-card px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-mocha">Subtotal</span>
                <span className="text-lg font-bold text-espresso">{formatPrice(totalSubtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-mocha">Shipping & taxes calculated at checkout</p>

              {shopItems.length > 0 && (
                <Link
                  href="/shop/cart"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-3 flex w-full items-center justify-center"
                >
                  Shop Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}

              {menuItems.length > 0 && (
                <Link
                  href="/order"
                  onClick={() => setOpen(false)}
                  className={`flex w-full items-center justify-center py-3 text-base font-medium rounded-xl transition-colors ${
                    shopItems.length > 0
                      ? "btn-secondary mt-2"
                      : "btn-accent mt-4"
                  }`}
                >
                  Place Menu Order
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

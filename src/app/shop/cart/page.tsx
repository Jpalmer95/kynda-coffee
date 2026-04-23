"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/hooks/useCart";
import { useToast } from "@/components/ui/Toast";
import { formatPrice, calculateTax, calculateShipping } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Gift } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal_cents, updateQuantity, removeItem, clearCart, discount_cents, promo_code, applyPromo, removePromo } = useCartStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const { toast } = useToast();

  const tax = calculateTax(subtotal_cents);
  const shipping = calculateShipping(subtotal_cents - (discount_cents ?? 0));
  const total = Math.max(0, subtotal_cents + tax + shipping - (discount_cents ?? 0));
  const freeShippingRemaining = Math.max(0, 5000 - (subtotal_cents - (discount_cents ?? 0)));

  async function handleCheckout() {
    if (!email || items.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            variant: i.selectedVariant,
          })),
          customer_email: email,
          success_url: `${window.location.origin}/shop/checkout?success=true`,
          cancel_url: `${window.location.origin}/shop/cart`,
          promo_code: promo_code ?? undefined,
          discount_cents: discount_cents ?? undefined,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast(data.error || "Checkout failed. Please try again.", "error");
      }
    } catch (err) {
      toast("Checkout failed. Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch("/api/checkout/apply-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal_cents: subtotal_cents }),
      });
      const data = await res.json();
      if (res.ok) {
        applyPromo(data.code, data.discount_cents);
        toast(`Promo applied: -${formatPrice(data.discount_cents)}`, "info");
        setPromoCode("");
      } else {
        setPromoError(data.error || "Invalid promo code");
      }
    } catch {
      setPromoError("Failed to apply promo code");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemove(productId: string, productName: string) {
    removeItem(productId);
    toast(`Removed ${productName} from cart`, "info");
  }

  if (items.length === 0) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-latte/20">
            <ShoppingBag className="h-10 w-10 text-latte" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-heading text-2xl sm:text-3xl font-bold text-espresso">
            Your Cart is Empty
          </h1>
          <p className="mt-2 text-mocha">Browse our shop and add something you love.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop" className="btn-primary w-full sm:w-auto">
              Continue Shopping
            </Link>
            <Link href="/menu" className="btn-secondary w-full sm:w-auto">
              Order for Pickup
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding pb-28 sm:pb-16">
      <div className="container-max">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
            Your Cart ({items.reduce((sum, i) => sum + i.quantity, 0)})
          </h1>
          <button
            onClick={() => {
              clearCart();
              toast("Cart cleared", "info");
            }}
            className="text-sm text-mocha transition-colors hover:text-rust focus-visible:ring-2 focus-visible:ring-rust rounded px-2 py-1"
          >
            Clear all
          </button>
        </div>

        <div className="mt-6 sm:mt-8 grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {items.map((item) => (
              <div
                key={`${item.product.id}-${JSON.stringify(item.selectedVariant)}`}
                className="flex gap-3 sm:gap-4 rounded-xl border border-latte/20 bg-white p-3 sm:p-4"
              >
                {/* Product image */}
                <Link
                  href={`/shop/product/${item.product.slug}`}
                  className="flex-shrink-0"
                >
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-gradient-to-br from-amber-800 to-stone-900 overflow-hidden">
                    {item.product.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-2xl opacity-50">☕</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/shop/product/${item.product.slug}`}
                      className="font-medium text-sm sm:text-base text-espresso hover:text-rust transition-colors"
                    >
                      {item.product.name}
                    </Link>
                    <div className="mt-0.5 text-xs sm:text-sm text-mocha space-y-0.5">
                      {item.selectedVariant?.size && (
                        <p>Size: {item.selectedVariant.size}</p>
                      )}
                      {item.selectedVariant?.grind && (
                        <p>Grind: {item.selectedVariant.grind.replace(/-/g, " ")}</p>
                      )}
                      {item.selectedVariant?.color && (
                        <p>Color: {item.selectedVariant.color}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-latte bg-white text-espresso transition-colors hover:bg-latte/20 focus-visible:ring-2 focus-visible:ring-rust"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-latte bg-white text-espresso transition-colors hover:bg-latte/20 focus-visible:ring-2 focus-visible:ring-rust"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm sm:text-base font-semibold text-espresso">
                        {formatPrice(item.product.price_cents * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemove(item.product.id, item.product.name)}
                        className="rounded-lg p-1.5 text-mocha transition-colors hover:bg-rust/10 hover:text-rust focus-visible:ring-2 focus-visible:ring-rust"
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Free shipping progress */}
            {freeShippingRemaining > 0 && (
              <div className="rounded-xl border border-latte/20 bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-mocha">
                  <Truck className="h-4 w-4 text-rust" aria-hidden="true" />
                  <span>Add {formatPrice(freeShippingRemaining)} more for free shipping!</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-latte/20">
                  <div
                    className="h-full rounded-full bg-rust transition-all"
                    style={{ width: `${Math.min(100, (subtotal_cents / 5000) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {freeShippingRemaining === 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage">
                <Gift className="h-4 w-4" aria-hidden="true" />
                <span>You unlocked free shipping!</span>
              </div>
            )}
          </div>

          {/* Order Summary - Desktop */}
          <div className="hidden lg:block">
            <div className="rounded-xl border border-latte/20 bg-white p-6 sticky top-24">
              <h2 className="font-heading text-xl font-semibold text-espresso">Order Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-mocha">Subtotal</span>
                  <span className="font-medium text-espresso">{formatPrice(subtotal_cents)}</span>
                </div>
                {(discount_cents ?? 0) > 0 && (
                  <div className="flex justify-between text-sage">
                    <span className="font-medium">Discount ({promo_code})</span>
                    <span className="font-medium">-{formatPrice(discount_cents ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-mocha">Tax (8.25%)</span>
                  <span className="font-medium text-espresso">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mocha">Shipping</span>
                  <span className="font-medium text-espresso">
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </span>
                </div>
                <div className="border-t border-latte/20 pt-3 flex justify-between text-base">
                  <span className="font-semibold text-espresso">Total</span>
                  <span className="font-semibold text-espresso">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Promo code */}
                {promo_code ? (
                  <div className="flex items-center justify-between rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 text-sm">
                    <span className="font-medium text-sage">{promo_code}</span>
                    <span className="text-sage">-{formatPrice(discount_cents ?? 0)}</span>
                    <button onClick={removePromo} className="ml-2 text-xs text-mocha underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Promo / Gift Card"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                        className="input-field text-sm flex-1"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="btn-secondary px-3 text-sm"
                      >
                        {promoLoading ? "..." : "Apply"}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-600">{promoError}</p>
                    )}
                  </div>
                )}
                <input
                  type="email"
                  required
                  placeholder="Email for order updates"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field text-sm"
                />
                <button
                  onClick={handleCheckout}
                  disabled={loading || !email}
                  className="btn-primary w-full"
                >
                  {loading ? "Redirecting..." : (
                    <>
                      Checkout
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-mocha">
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Checkout */}
      <div className="fixed bottom-[64px] left-0 right-0 z-40 border-t border-latte/20 bg-cream/95 pb-safe pt-3 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-lg lg:hidden">
        <div className="space-y-3">
          {/* Mobile promo */}
          {promo_code ? (
            <div className="flex items-center justify-between rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 text-sm">
              <span className="font-medium text-sage">{promo_code}</span>
              <div className="flex items-center gap-2">
                <span className="text-sage">-{formatPrice(discount_cents ?? 0)}</span>
                <button onClick={removePromo} className="text-xs text-mocha underline">Remove</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Promo / Gift Card"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                className="input-field text-sm flex-1"
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCode.trim()}
                className="btn-secondary px-3 text-sm"
              >
                {promoLoading ? "..." : "Apply"}
              </button>
            </div>
          )}
          {promoError && <p className="text-xs text-red-600 -mt-1">{promoError}</p>}
          <input
            type="email"
            required
            placeholder="Email for order updates"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field text-sm"
          />
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-mocha">
                {(discount_cents ?? 0) > 0 ? (
                  <span className="line-through">{formatPrice(subtotal_cents + tax + shipping)}</span>
                ) : (
                  "Total"
                )}
              </span>
              <span className="text-lg font-bold text-espresso">{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading || !email}
              className="btn-primary flex-1 py-3"
            >
              {loading ? "Redirecting..." : "Checkout"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

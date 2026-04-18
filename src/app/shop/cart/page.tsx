"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice, calculateTax, calculateShipping } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal_cents, updateQuantity, removeItem } = useCartStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const tax = calculateTax(subtotal_cents);
  const shipping = calculateShipping(subtotal_cents);
  const total = subtotal_cents + tax + shipping;

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
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-latte" />
          <h1 className="mt-4 font-heading text-3xl font-bold text-espresso">
            Your Cart is Empty
          </h1>
          <p className="mt-2 text-mocha">Browse our shop and add something you love.</p>
          <a href="/shop" className="btn-primary mt-6 inline-flex">
            Continue Shopping
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        <h1 className="font-heading text-3xl font-bold text-espresso">Your Cart</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-4 rounded-xl border border-latte/20 bg-white p-4"
              >
                <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-latte/20" />
                <div className="flex-1">
                  <h3 className="font-medium text-espresso">{item.product.name}</h3>
                  {item.selectedVariant?.size && (
                    <p className="text-sm text-mocha">Size: {item.selectedVariant.size}</p>
                  )}
                  <p className="mt-1 font-medium text-espresso">
                    {formatPrice(item.product.price_cents)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="rounded-full p-1 hover:bg-latte/20"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="rounded-full p-1 hover:bg-latte/20"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-mocha transition-colors hover:text-rust"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="rounded-xl border border-latte/20 bg-white p-6">
            <h2 className="font-heading text-xl font-semibold text-espresso">Order Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-mocha">Subtotal</span>
                <span className="font-medium text-espresso">{formatPrice(subtotal_cents)}</span>
              </div>
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

            {subtotal_cents < 5000 && (
              <p className="mt-3 text-xs text-mocha">
                Add {formatPrice(5000 - subtotal_cents)} more for free shipping!
              </p>
            )}

            <div className="mt-4">
              <input
                type="email"
                placeholder="Email for order updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || !email}
              className="btn-primary mt-4 w-full"
            >
              {loading ? "Redirecting..." : "Checkout"}
            </button>

            <p className="mt-3 text-center text-xs text-mocha">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

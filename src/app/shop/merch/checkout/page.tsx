"use client";

import { useState } from "react";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import {
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Truck,
} from "lucide-react";
import Link from "next/link";

interface CartMerchItem {
  product: {
    id: string;
    name: string;
    price_cents: number;
    images?: string[];
    design_data?: {
      product_id?: string;
      printful_product_id?: number;
      printful_variant_id?: number;
      variant_size?: string;
      variant_color?: string;
      layers?: unknown[];
      view?: string;
    };
  };
  quantity: number;
}

/**
 * Merch checkout — wallet-first.
 *
 * No address form: Stripe Checkout collects shipping address, email, and
 * phone (auto-filled by Apple Pay / Google Pay / Link wallets). The Stripe
 * webhook then creates + confirms the Printful order from the Stripe-verified
 * address, so the customer never types anything a wallet already knows.
 */
export default function MerchCheckoutPage() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Filter to only design studio items
  const merchItems = (items as CartMerchItem[]).filter(
    (item) =>
      (item.product as any)?.source === "design_studio" ||
      item.product?.design_data
  );

  const subtotalCents = merchItems.reduce(
    (sum, i) => sum + i.product.price_cents * i.quantity,
    0
  );
  const shippingCents = subtotalCents >= 5000 ? 0 : 599;
  const totalCents = subtotalCents + shippingCents;

  if (merchItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-mocha/40 mb-4" />
        <h1 className="font-heading text-3xl font-bold text-espresso">
          Your cart is empty
        </h1>
        <p className="mt-2 text-mocha">
          Head to the{" "}
          <Link href="/studio" className="text-forest underline">
            Design Studio
          </Link>{" "}
          to create custom merch.
        </p>
      </div>
    );
  }

  async function handleCheckout() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/merch-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: merchItems.map((i) => ({
            product_id: i.product.design_data?.product_id || i.product.id,
            printful_product_id: i.product.design_data?.printful_product_id || 0,
            printful_variant_id: i.product.design_data?.printful_variant_id || 0,
            name: i.product.name,
            quantity: i.quantity,
            price_cents: i.product.price_cents,
            size: i.product.design_data?.variant_size,
            color: i.product.design_data?.variant_color,
            layers: i.product.design_data?.layers,
            view: i.product.design_data?.view,
            design_data: i.product.design_data,
          })),
          shipping_rate_cents: shippingCents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Checkout failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe Checkout (collects address + payment in one step)
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        setError("No checkout URL returned. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
      {/* Header */}
      <Link
        href="/studio"
        className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso mb-6"
      >
        <ArrowLeft size={14} /> Back to Studio
      </Link>

      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso mb-8">
        Merch Checkout
      </h1>

      {/* Order Summary */}
      <div className="bg-card rounded-xl p-6 border border-latte/20 mb-6">
        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

        <div className="space-y-3 mb-4">
          {merchItems.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {item.product.images?.[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  <ShoppingBag size={20} className="text-mocha/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {item.product.name}
                </div>
                <div className="text-xs text-mocha">
                  {item.product.design_data?.variant_size && (
                    <span>Size: {item.product.design_data.variant_size}</span>
                  )}
                  {item.product.design_data?.variant_color && (
                    <span className="ml-2">
                      Color: {item.product.design_data.variant_color}
                    </span>
                  )}
                  {item.quantity > 1 && (
                    <span className="ml-2">×{item.quantity}</span>
                  )}
                </div>
              </div>
              <div className="text-sm font-medium tabular-nums">
                {formatPrice(item.product.price_cents * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-latte/20 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-mocha">Subtotal</span>
            <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-mocha">Shipping</span>
            <span className="tabular-nums">
              {shippingCents === 0 ? "Free" : formatPrice(shippingCents)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t border-latte/20">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(totalCents)}</span>
          </div>
        </div>
      </div>

      {/* Shipping note */}
      <div className="flex items-start gap-3 bg-card/50 rounded-xl p-4 border border-latte/20 mb-6 text-sm text-mocha">
        <Truck size={18} className="shrink-0 mt-0.5" />
        <p>
          You'll enter (or auto-fill with Apple Pay / Google Pay / Link) your
          shipping address on the next secure payment step — no forms to fill
          out here.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={submitting}
        className="w-full py-4 rounded-xl bg-forest text-white font-medium text-lg flex items-center justify-center gap-2 hover:bg-forest/90 transition disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Preparing secure checkout...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Continue to Payment — {formatPrice(totalCents)}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-mocha mt-4">
        <ShieldCheck size={14} />
        Secure payment via Stripe (Apple Pay, Google Pay, Link, card). Designs
        are moderated before printing.
      </div>

      <div className="mt-4 text-xs text-mocha text-center space-y-1">
        <p>Made to order — ships in 5–8 business days • Returns accepted for defects only • Powered by Printful</p>
      </div>
    </div>
  );
}

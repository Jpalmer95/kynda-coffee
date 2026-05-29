"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import {
  ShoppingBag,
  Truck,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  Loader2,
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

export default function MerchCheckoutPage() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [recipient, setRecipient] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
  });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Validate
      if (!recipient.name || !recipient.email || !recipient.line1 || !recipient.city || !recipient.state || !recipient.zip) {
        setError("Please fill in all required fields.");
        setSubmitting(false);
        return;
      }

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
          recipient,
          shipping_rate_cents: shippingCents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Checkout failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe Checkout
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

  function updateField(field: string, value: string) {
    setRecipient((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
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

      <div className="grid md:grid-cols-[1fr_380px] gap-8">
        {/* Left: Shipping Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-latte/20">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck size={18} /> Shipping Address
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-mocha mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipient.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="form-input"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-mocha mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={recipient.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="form-input"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-mocha mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={recipient.line1}
                  onChange={(e) => updateField("line1", e.target.value)}
                  className="form-input"
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-mocha mb-1">
                  Apt / Suite
                </label>
                <input
                  type="text"
                  value={recipient.line2}
                  onChange={(e) => updateField("line2", e.target.value)}
                  className="form-input"
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mocha mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipient.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="form-input"
                    placeholder="Austin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mocha mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipient.state}
                    onChange={(e) => updateField("state", e.target.value.toUpperCase())}
                    maxLength={2}
                    className="form-input"
                    placeholder="TX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-mocha mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  value={recipient.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  className="form-input max-w-[200px]"
                  placeholder="78657"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-forest text-white font-medium text-lg flex items-center justify-center gap-2 hover:bg-forest/90 transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={20} />
                Pay {formatPrice(totalCents)}
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-mocha">
            <ShieldCheck size={14} />
            Secure payment via Stripe. Designs are moderated before printing.
          </div>
        </form>

        {/* Right: Order Summary */}
        <div className="bg-card rounded-xl p-6 border border-latte/20 h-fit sticky top-24">
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

          <div className="mt-4 text-xs text-mocha space-y-1">
            <p>• Made to order — ships in 5–8 business days</p>
            <p>• Returns accepted for defects only</p>
            <p>• Powered by Printful</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, Loader2, ArrowRight } from "lucide-react";

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total_cents: number;
  shipping_cents: number;
  tax_cents: number;
  subtotal_cents: number;
  items: OrderItem[];
  shipping_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

const STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getStatusIndex(status: string) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status.toLowerCase());
  return idx >= 0 ? idx : 0;
}

export default function TrackOrderPage() {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setOrder(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to find order");
      }

      setOrder(data.order);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
          Track Your Order
        </h1>
        <p className="mt-2 text-mocha">
          Enter your email and order number to check your order status.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {status === "error" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="track-email" className="mb-1 block text-sm font-medium text-espresso">
                Email
              </label>
              <input
                id="track-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label htmlFor="track-order" className="mb-1 block text-sm font-medium text-espresso">
                Order Number
              </label>
              <input
                id="track-order"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                className="input-field uppercase"
                placeholder="KYN-1234567890"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary flex items-center gap-2"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Track Order
              </>
            )}
          </button>
        </form>

        {order && (
          <div className="mt-10 space-y-6">
            {/* Status Timeline */}
            <div className="rounded-2xl border border-latte/20 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-bold text-espresso">
                    Order {order.order_number}
                  </h2>
                  <p className="text-sm text-mocha">
                    Placed {new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    order.status === "delivered"
                      ? "bg-sage/10 text-sage"
                      : order.status === "shipped"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              {/* Stepper */}
              <div className="mt-6">
                <ol className="flex items-center justify-between" aria-label="Order progress">
                  {STATUS_STEPS.map((step, i) => {
                    const currentIdx = getStatusIndex(order.status);
                    const isCompleted = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    const Icon = step.icon;

                    return (
                      <li key={step.key} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? "border-sage bg-sage text-white"
                              : "border-latte/30 bg-white text-mocha"
                          } ${isCurrent ? "ring-2 ring-sage/30" : ""}`}
                          aria-current={isCurrent ? "step" : undefined}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span
                          className={`text-center text-[11px] font-medium sm:text-xs ${
                            isCompleted ? "text-espresso" : "text-mocha/60"
                          }`}
                        >
                          {step.label}
                        </span>
                        {i < STATUS_STEPS.length - 1 && (
                          <div
                            className={`absolute left-0 top-5 hidden h-0.5 w-full sm:block ${
                              i < currentIdx ? "bg-sage" : "bg-latte/20"
                            }`}
                            style={{ transform: "translateX(50%)", width: "100%" }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
                {/* Connecting line for stepper */}
                <div className="relative mt-2 hidden px-5 sm:block">
                  <div className="flex items-center justify-between">
                    {STATUS_STEPS.slice(0, -1).map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 ${i < getStatusIndex(order.status) ? "bg-sage" : "bg-latte/20"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-latte/20 bg-white p-5 sm:p-6">
              <h3 className="mb-3 font-heading text-base font-semibold text-espresso">Items</h3>
              <ul className="space-y-3">
                {order.items?.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-espresso">{item.product_name}</p>
                      <p className="text-mocha">Qty {item.quantity}</p>
                    </div>
                    <span className="font-medium text-espresso">{formatCents(item.total_cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 border-t border-latte/10 pt-4 text-sm">
                <div className="flex justify-between text-mocha">
                  <span>Subtotal</span>
                  <span>{formatCents(order.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-mocha">
                  <span>Shipping</span>
                  <span>{formatCents(order.shipping_cents)}</span>
                </div>
                <div className="flex justify-between text-mocha">
                  <span>Tax</span>
                  <span>{formatCents(order.tax_cents)}</span>
                </div>
                <div className="flex justify-between font-semibold text-espresso pt-1">
                  <span>Total</span>
                  <span>{formatCents(order.total_cents)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="rounded-2xl border border-latte/20 bg-white p-5 sm:p-6">
                <h3 className="mb-2 font-heading text-base font-semibold text-espresso">Shipping Address</h3>
                <address className="not-italic text-sm text-mocha">
                  <p>{order.shipping_address.line1}</p>
                  {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </address>
              </div>
            )}
          </div>
        )}

        {/* Help CTA */}
        <div className="mt-10 rounded-2xl border border-latte/20 bg-cream p-5 sm:p-6">
          <h2 className="font-heading text-base font-semibold text-espresso">Need Help?</h2>
          <p className="mt-1 text-sm text-mocha">
            Can&apos;t find your order? Reach out and we&apos;ll help you track it down.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary text-sm">
              Contact Us
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
            <a href="tel:+151****6781" className="btn-secondary text-sm">
              Call (512) 219-6781
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

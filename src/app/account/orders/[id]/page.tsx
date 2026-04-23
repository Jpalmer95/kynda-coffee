"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CheckCircle, RotateCcw, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/hooks/useCart";
import { useToast } from "@/components/ui/Toast";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  items: { product_name: string; quantity: number; unit_price_cents: number; total_cents: number }[];
  shipping_address?: any;
  created_at: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data.order ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  function handleReorder() {
    if (!order) return;
    let count = 0;
    for (const item of order.items) {
        addItem(
        {
          id: `reorder-${item.product_name}`,
          name: item.product_name,
          price_cents: item.unit_price_cents,
          images: [],
          category: "coffee-beans",
          slug: "",
          description: "",
          source: "online",
          is_active: true,
          is_featured: false,
          track_inventory: false,
          created_at: "",
          updated_at: "",
        },
        item.quantity
      );
      count++;
    }
    toast(`Added ${count} items to cart`, "cart");
  }

  if (loading) {
    return (
      <div className="container-max py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-max py-12 text-center">
        <p className="text-mocha">Order not found</p>
        <button onClick={() => router.push("/account/orders")} className="btn-primary mt-4">
          Back to Orders
        </button>
      </div>
    );
  }

  const steps = [
    { label: "Confirmed", icon: Package, active: true },
    { label: "Processing", icon: RotateCcw, active: ["processing", "shipped", "delivered"].includes(order.status) },
    { label: "Shipped", icon: Truck, active: ["shipped", "delivered"].includes(order.status) },
    { label: "Delivered", icon: CheckCircle, active: order.status === "delivered" },
  ];

  return (
    <div className="container-max py-6 sm:py-10">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso mb-4">
        <ArrowLeft className="h-4 w-4" /> All Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-espresso">Order {order.order_number}</h1>
          <p className="text-sm text-mocha">Placed {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-medium text-sage capitalize">{order.status}</span>
          <button onClick={handleReorder} className="btn-secondary text-sm">Reorder</button>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-latte/20 bg-white p-5 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step.active ? "bg-rust text-white" : "bg-latte/20 text-mocha"}`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`mt-1.5 text-[10px] sm:text-xs font-medium ${step.active ? "text-espresso" : "text-mocha"}`}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-1 h-px flex-1 ${step.active ? "bg-rust" : "bg-latte/20"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-latte/20 bg-white p-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-800 to-stone-900 text-xl">
                ☕
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-espresso truncate">{item.product_name}</p>
                <p className="text-sm text-mocha">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-espresso">{formatPrice(item.total_cents)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-latte/20 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold text-espresso mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-mocha"><span>Subtotal</span><span>{formatPrice(order.subtotal_cents)}</span></div>
              <div className="flex justify-between text-mocha"><span>Tax</span><span>{formatPrice(order.tax_cents)}</span></div>
              <div className="flex justify-between text-mocha"><span>Shipping</span><span>{formatPrice(order.shipping_cents)}</span></div>
              <div className="flex justify-between border-t border-latte/20 pt-2 text-base font-semibold text-espresso">
                <span>Total</span><span>{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          </div>

          {order.shipping_address && (
            <div className="rounded-xl border border-latte/20 bg-white p-5">
              <h2 className="font-heading text-lg font-semibold text-espresso mb-2">Shipping Address</h2>
              <p className="text-sm text-mocha">{order.shipping_address.line1}</p>
              {order.shipping_address.line2 && <p className="text-sm text-mocha">{order.shipping_address.line2}</p>}
              <p className="text-sm text-mocha">{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

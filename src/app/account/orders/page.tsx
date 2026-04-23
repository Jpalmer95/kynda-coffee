import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("email", user.email)
    .order("created_at", { ascending: false })
    .limit(50);

  const statusConfig: Record<string, { icon: typeof Package; label: string; color: string; bg: string }> = {
    confirmed: { icon: CheckCircle, label: "Confirmed", color: "text-sage", bg: "bg-sage/10" },
    processing: { icon: Clock, label: "Processing", color: "text-amber-600", bg: "bg-amber-50" },
    shipped: { icon: Truck, label: "Shipped", color: "text-blue-600", bg: "bg-blue-50" },
    delivered: { icon: CheckCircle, label: "Delivered", color: "text-sage", bg: "bg-sage/10" },
    cancelled: { icon: Package, label: "Cancelled", color: "text-mocha", bg: "bg-latte/20" },
  };

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Order History
        </h1>
        <p className="mt-1 text-sm text-mocha">
          Track and review your past purchases.{" "}
          <Link href="/track-order" className="text-rust hover:underline">
            Track a guest order
          </Link>
        </p>

        {(!orders || orders.length === 0) ? (
          <div className="mt-8 rounded-2xl border border-latte/20 bg-white py-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg font-medium text-espresso">No orders yet</p>
            <p className="mt-1 text-sm text-mocha">
              When you place an order, it will appear here.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/shop" className="btn-primary inline-flex">
                Start Shopping
              </Link>
              <Link href="/track-order" className="btn-secondary inline-flex text-sm">
                Track an Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.confirmed;
              const items = (order.items as any[]) || [];
              const StatusIcon = status.icon;

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-latte/20 bg-white p-4 sm:p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-semibold text-espresso">
                          {order.order_number || `Order #${order.id.slice(0, 8)}`}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-mocha">
                        Placed on {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-heading text-lg font-bold text-espresso">
                        {formatPrice(order.total_cents)}
                      </p>
                      <p className="text-xs text-mocha">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-4 space-y-2 border-t border-latte/10 pt-4">
                    {items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-espresso">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="text-mocha">
                          {formatPrice(item.total_cents)}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-mocha">
                        +{items.length - 3} more item(s)
                      </p>
                    )}
                  </div>

                  {/* Tracking or reorder */}
                  <div className="mt-4 flex items-center gap-3 border-t border-latte/10 pt-4">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-sm font-medium text-rust hover:underline"
                    >
                      View Details
                    </Link>
                    {order.tracking_number ? (
                      <a
                        href={`https://track.printful.com/${order.tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-rust hover:underline"
                      >
                        Track Shipment
                      </a>
                    ) : (
                      <span className="text-sm text-mocha">Tracking available soon</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

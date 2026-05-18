import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  total_cents: number | null;
  created_at: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  inventory_count: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

type SubscriptionRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  customers?: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
};

type Notification = {
  id: string;
  type: "order" | "inventory" | "subscription";
  title: string;
  message: string;
  timestamp: string | null;
  urgent: boolean;
  read: boolean;
  href?: string;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [ordersResult, productsResult, subscriptionsResult] = await Promise.all([
      supabaseAdmin()
        .from("orders")
        .select("id, order_number, email, status, source, total_cents, created_at")
        .in("status", ["pending", "confirmed", "processing"])
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin()
        .from("products")
        .select("id, name, inventory_count, is_active, updated_at")
        .eq("is_active", true)
        .not("inventory_count", "is", null)
        .lte("inventory_count", 5)
        .order("inventory_count", { ascending: true })
        .limit(15),
      supabaseAdmin()
        .from("subscriptions")
        .select("id, status, created_at, customers:customer_id ( email, full_name )")
        .in("status", ["past_due", "trialing"])
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (ordersResult.error) console.error("Notifications orders fetch error:", ordersResult.error);
    if (productsResult.error) console.error("Notifications products fetch error:", productsResult.error);
    if (subscriptionsResult.error) console.error("Notifications subscriptions fetch error:", subscriptionsResult.error);

    const orderNotifications: Notification[] = ((ordersResult.data ?? []) as OrderRow[]).map((order) => ({
      id: `order-${order.id}`,
      type: "order",
      title: order.status === "processing" ? "Order in progress" : "Active order needs attention",
      message: `${order.order_number ?? "Order"} • ${order.email ?? "guest"} • $${((order.total_cents ?? 0) / 100).toFixed(2)} • ${order.source ?? "website"}`,
      timestamp: order.created_at,
      urgent: ["pending", "confirmed"].includes(order.status ?? ""),
      read: false,
      href: "/admin/kds",
    }));

    const inventoryNotifications: Notification[] = ((productsResult.data ?? []) as ProductRow[]).map((product) => ({
      id: `inventory-${product.id}`,
      type: "inventory",
      title: "Low stock alert",
      message: `${product.name} has ${product.inventory_count ?? 0} units left`,
      timestamp: product.updated_at,
      urgent: (product.inventory_count ?? 0) <= 2,
      read: false,
      href: "/admin/inventory",
    }));

    const subscriptionNotifications: Notification[] = ((subscriptionsResult.data ?? []) as SubscriptionRow[]).map((subscription) => {
      const customer = firstRelated(subscription.customers);
      const isPastDue = subscription.status === "past_due";
      return {
        id: `subscription-${subscription.id}`,
        type: "subscription",
        title: isPastDue ? "Subscription payment failed" : "Subscription trialing",
        message: `${customer?.full_name || customer?.email || "Customer"} • ${subscription.status}`,
        timestamp: subscription.created_at,
        urgent: isPastDue,
        read: false,
        href: "/admin/subscriptions",
      };
    });

    const notifications = [
      ...orderNotifications,
      ...inventoryNotifications,
      ...subscriptionNotifications,
    ].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Admin notifications API error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user } = await getAdminUser(req as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00Z`;

    // Parallel queries
    const [
      { count: todayOrdersCount, error: ordersErr },
      { count: customersCount, error: customersErr },
      { count: productsCount, error: productsErr },
      { count: subscribersCount, error: subsErr },
      { data: todayRevenue, error: revenueErr },
    ] = await Promise.all([
      supabaseAdmin()
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart),
      supabaseAdmin()
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin()
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin()
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("subscribed", true),
      supabaseAdmin()
        .from("orders")
        .select("total_cents")
        .gte("created_at", todayStart)
        .in("status", ["confirmed", "processing", "shipped", "delivered"]),
    ]);

    if (ordersErr || customersErr || productsErr || subsErr || revenueErr) {
      console.error("Admin stats error:", { ordersErr, customersErr, productsErr, subsErr, revenueErr });
    }

    const todayRevenueCents = (todayRevenue ?? []).reduce(
      (sum, o) => sum + (o.total_cents || 0),
      0
    );

    return NextResponse.json({
      today_revenue_cents: todayRevenueCents,
      today_orders: todayOrdersCount ?? 0,
      total_customers: customersCount ?? 0,
      active_products: productsCount ?? 0,
      newsletter_subscribers: subscribersCount ?? 0,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

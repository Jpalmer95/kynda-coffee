import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Revenue by day (last 30 days)
    const { data: revenue } = await supabaseAdmin()
      .from("orders")
      .select("created_at, total_cents")
      .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString())
      .eq("status", "confirmed");

    const revenueByDay: Record<string, number> = {};
    for (const row of revenue ?? []) {
      const day = row.created_at.split("T")[0];
      revenueByDay[day] = (revenueByDay[day] ?? 0) + (row.total_cents ?? 0);
    }

    // Orders by status
    const { data: statusCounts } = await supabaseAdmin()
      .from("orders")
      .select("status");

    const ordersByStatus: Record<string, number> = {};
    for (const row of statusCounts ?? []) {
      ordersByStatus[row.status] = (ordersByStatus[row.status] ?? 0) + 1;
    }

    // Top products by units sold
    const { data: allOrders } = await supabaseAdmin()
      .from("orders")
      .select("items")
      .in("status", ["confirmed", "processing", "shipped", "delivered"]);

    const productSales: Record<string, { name: string; units: number; revenue: number }> = {};
    for (const order of allOrders ?? []) {
      for (const item of order.items ?? []) {
        const name = item.product_name ?? "Unknown";
        if (!productSales[name]) {
          productSales[name] = { name, units: 0, revenue: 0 };
        }
        productSales[name].units += item.quantity ?? 1;
        productSales[name].revenue += item.total_cents ?? 0;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    // Category breakdown
    const { data: products } = await supabaseAdmin()
      .from("products")
      .select("category, price_cents");

    const categoryCounts: Record<string, { count: number; value: number }> = {};
    for (const p of products ?? []) {
      if (!categoryCounts[p.category]) {
        categoryCounts[p.category] = { count: 0, value: 0 };
      }
      categoryCounts[p.category].count += 1;
      categoryCounts[p.category].value += p.price_cents ?? 0;
    }

    // Customer growth (last 30 days)
    const { data: newCustomers } = await supabaseAdmin()
      .from("profiles")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString());

    const customersByDay: Record<string, number> = {};
    for (const row of newCustomers ?? []) {
      const day = row.created_at.split("T")[0];
      customersByDay[day] = (customersByDay[day] ?? 0) + 1;
    }

    return NextResponse.json({
      revenue_by_day: revenueByDay,
      orders_by_status: ordersByStatus,
      top_products: topProducts,
      category_breakdown: categoryCounts,
      customers_by_day: customersByDay,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}

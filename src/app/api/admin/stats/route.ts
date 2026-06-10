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
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00Z`;
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const days14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const REVENUE_STATUSES = ["confirmed", "processing", "ready", "complete", "fulfilled", "shipped", "delivered"];

    // Parallel queries
    const [
      { count: todayOrdersCount, error: ordersErr },
      { count: customersCount, error: customersErr },
      { count: productsCount, error: productsErr },
      { count: subscribersCount, error: subsErr },
      { data: todayRevenue, error: revenueErr },
      { data: rev30 },
      { count: pendingApprovals },
      { count: openAlerts },
      { count: newLeads },
      { count: pendingRequests },
      { data: upcomingSpecials },
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
        .in("status", REVENUE_STATUSES),
      // 30 days of revenue rows → trends computed below
      supabaseAdmin()
        .from("orders")
        .select("total_cents, created_at")
        .gte("created_at", days30)
        .in("status", REVENUE_STATUSES),
      // Needs-attention counters (each tolerates a missing table)
      supabaseAdmin()
        .from("social_posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_approval"),
      supabaseAdmin()
        .from("inventory_alerts")
        .select("*", { count: "exact", head: true })
        .eq("acknowledged", false),
      supabaseAdmin()
        .from("b2b_leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
      supabaseAdmin()
        .from("schedule_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin()
        .from("specials")
        .select("id, title, starts_at, ends_at")
        .eq("is_active", true)
        .or(`ends_at.gte.${now.toISOString()},ends_at.is.null`)
        .order("starts_at", { ascending: true })
        .limit(3),
    ]);

    if (ordersErr || customersErr || productsErr || subsErr || revenueErr) {
      console.error("Admin stats error:", { ordersErr, customersErr, productsErr, subsErr, revenueErr });
    }

    const todayRevenueCents = (todayRevenue ?? []).reduce(
      (sum, o) => sum + (o.total_cents || 0),
      0
    );

    // Revenue trend: this week vs last week (week-over-week growth signal).
    const rows = rev30 ?? [];
    const sumWindow = (fromIso: string, toIso?: string) =>
      rows
        .filter((r) => r.created_at >= fromIso && (!toIso || r.created_at < toIso))
        .reduce((s, r) => s + (r.total_cents || 0), 0);

    const last7Cents = sumWindow(days7);
    const prev7Cents = sumWindow(days14, days7);
    const last30Cents = sumWindow(days30);
    const wowGrowthPct =
      prev7Cents > 0 ? ((last7Cents - prev7Cents) / prev7Cents) * 100 : null;

    return NextResponse.json({
      today_revenue_cents: todayRevenueCents,
      today_orders: todayOrdersCount ?? 0,
      total_customers: customersCount ?? 0,
      active_products: productsCount ?? 0,
      newsletter_subscribers: subscribersCount ?? 0,
      // Growth signals
      revenue_7d_cents: last7Cents,
      revenue_prev_7d_cents: prev7Cents,
      revenue_30d_cents: last30Cents,
      wow_growth_pct: wowGrowthPct === null ? null : Number(wowGrowthPct.toFixed(1)),
      // Needs attention
      pending_marketing_approvals: pendingApprovals ?? 0,
      open_inventory_alerts: openAlerts ?? 0,
      new_b2b_leads: newLeads ?? 0,
      pending_schedule_requests: pendingRequests ?? 0,
      upcoming_specials: upcomingSpecials ?? [],
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

// Business data aggregator for the AI Strategist.
// Pulls from existing admin API endpoints and Supabase to build a
// comprehensive business snapshot for the AI to analyze.

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface BusinessSnapshot {
  generated_at: string;
  revenue: {
    today_cents: number;
    today_orders: number;
    revenue_7d_cents: number;
    revenue_30d_cents: number;
    wow_growth_pct: number | null;
    avg_ticket_cents: number;
  };
  customers: {
    total: number;
    new_30d: number;
    newsletter_subscribers: number;
  };
  products: {
    active_count: number;
    low_stock_count: number;
  };
  marketing: {
    pending_approvals: number;
    social_posts_30d: number;
  };
  operations: {
    open_inventory_alerts: number;
    new_b2b_leads: number;
    pending_schedule_requests: number;
    upcoming_specials: number;
    waste_total_30d_cents: number;
  };
  top_products: { name: string; order_count: number; revenue_cents: number }[];
  recent_waste: { name: string; reason: string; total_cost_cents: number; waste_date: string }[];
}

const REVENUE_STATUSES = ["confirmed", "processing", "ready", "complete", "fulfilled", "shipped", "delivered"];

export async function getBusinessSnapshot(): Promise<BusinessSnapshot> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00Z`;
  const days7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const days14 = new Date(now.getTime() - 14 * 86400000).toISOString();
  const days30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Revenue queries
  const [
    { data: todayRevenue },
    { data: rev7 },
    { data: rev30 },
    { count: todayOrdersCount },
    { count: customersCount },
    { count: productsCount },
    { count: subscribersCount },
    { count: pendingApprovals },
    { count: openAlerts },
    { count: newLeads },
    { count: pendingRequests },
    { count: socialPosts30d },
  ] = await Promise.all([
    supabaseAdmin().from("orders").select("total_cents").gte("created_at", todayStart).in("status", REVENUE_STATUSES),
    supabaseAdmin().from("orders").select("total_cents").gte("created_at", days7).in("status", REVENUE_STATUSES),
    supabaseAdmin().from("orders").select("total_cents, created_at").gte("created_at", days30).in("status", REVENUE_STATUSES),
    supabaseAdmin().from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabaseAdmin().from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin().from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin().from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("subscribed", true),
    supabaseAdmin().from("social_posts").select("*", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabaseAdmin().from("inventory_alerts").select("*", { count: "exact", head: true }).eq("acknowledged", false),
    supabaseAdmin().from("b2b_leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabaseAdmin().from("schedule_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin().from("social_posts").select("*", { count: "exact", head: true }).gte("created_at", days30),
  ]);

  // Revenue calculations
  const todayCents = (todayRevenue ?? []).reduce((s, r: any) => s + (r.total_cents ?? 0), 0);
  const rev7Cents = (rev7 ?? []).reduce((s, r: any) => s + (r.total_cents ?? 0), 0);
  const rev30Cents = (rev30 ?? []).reduce((s, r: any) => s + (r.total_cents ?? 0), 0);

  // Previous 7 days for WoW growth
  const { data: revPrev7 } = await supabaseAdmin()
    .from("orders")
    .select("total_cents")
    .gte("created_at", days14)
    .lt("created_at", days7)
    .in("status", REVENUE_STATUSES);

  const revPrev7Cents = (revPrev7 ?? []).reduce((s, r: any) => s + (r.total_cents ?? 0), 0);
  const wowGrowth = revPrev7Cents > 0 ? Math.round(((rev7Cents - revPrev7Cents) / revPrev7Cents) * 100) : null;

  // New customers (30d)
  const { count: newCustomers30d } = await supabaseAdmin()
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", days30);

  // Top products (30d by revenue)
  const { data: orderItems } = await supabaseAdmin()
    .from("order_items")
    .select("name, quantity, total_cents")
    .gte("created_at", days30)
    .limit(500);

  const productMap = new Map<string, { name: string; order_count: number; revenue_cents: number }>();
  for (const item of orderItems ?? []) {
    const name = (item as any).name || "Unknown";
    const existing = productMap.get(name) ?? { name, order_count: 0, revenue_cents: 0 };
    existing.order_count += (item as any).quantity ?? 1;
    existing.revenue_cents += (item as any).total_cents ?? 0;
    productMap.set(name, existing);
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
    .slice(0, 10);

  // Recent waste (30d)
  const { data: wasteEntries } = await supabaseAdmin()
    .from("waste_log")
    .select("name, reason, total_cost_cents, waste_date")
    .gte("waste_date", days30.slice(0, 10))
    .order("waste_date", { ascending: false })
    .limit(20);

  const wasteTotal = (wasteEntries ?? []).reduce((s, w: any) => s + (w.total_cost_cents ?? 0), 0);

  // Low stock count (from inventory — items where stock < threshold)
  let lowStockCount = 0;
  try {
    const { count } = await supabaseAdmin()
      .from("inventory_alerts")
      .select("*", { count: "exact", head: true });
    lowStockCount = count ?? 0;
  } catch { /* table might not exist */ }

  return {
    generated_at: now.toISOString(),
    revenue: {
      today_cents: todayCents,
      today_orders: todayOrdersCount ?? 0,
      revenue_7d_cents: rev7Cents,
      revenue_30d_cents: rev30Cents,
      wow_growth_pct: wowGrowth,
      avg_ticket_cents: todayOrdersCount ? Math.round(todayCents / todayOrdersCount) : 0,
    },
    customers: {
      total: customersCount ?? 0,
      new_30d: newCustomers30d ?? 0,
      newsletter_subscribers: subscribersCount ?? 0,
    },
    products: {
      active_count: productsCount ?? 0,
      low_stock_count: lowStockCount,
    },
    marketing: {
      pending_approvals: pendingApprovals ?? 0,
      social_posts_30d: socialPosts30d ?? 0,
    },
    operations: {
      open_inventory_alerts: openAlerts ?? 0,
      new_b2b_leads: newLeads ?? 0,
      pending_schedule_requests: pendingRequests ?? 0,
      upcoming_specials: 0,
      waste_total_30d_cents: wasteTotal,
    },
    top_products: topProducts,
    recent_waste: (wasteEntries ?? []) as any[],
  };
}

export function formatSnapshotForPrompt(snap: BusinessSnapshot): string {
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return `BUSINESS SNAPSHOT (generated ${snap.generated_at}):

REVENUE:
- Today: ${money(snap.revenue.today_cents)} from ${snap.revenue.today_orders} orders
- Last 7 days: ${money(snap.revenue.revenue_7d_cents)}
- Last 30 days: ${money(snap.revenue.revenue_30d_cents)}
- Week-over-week growth: ${snap.revenue.wow_growth_pct !== null ? `${snap.revenue.wow_growth_pct}%` : "N/A"}
- Average ticket today: ${money(snap.revenue.avg_ticket_cents)}

CUSTOMERS:
- Total profiles: ${snap.customers.total}
- New (30d): ${snap.customers.new_30d}
- Newsletter subscribers: ${snap.customers.newsletter_subscribers}

PRODUCTS:
- Active products: ${snap.products.active_count}
- Low stock alerts: ${snap.products.low_stock_count}

MARKETING:
- Pending approvals: ${snap.marketing.pending_approvals}
- Social posts (30d): ${snap.marketing.social_posts_30d}

OPERATIONS:
- Open inventory alerts: ${snap.operations.open_inventory_alerts}
- New B2B leads: ${snap.operations.new_b2b_leads}
- Pending schedule requests: ${snap.operations.pending_schedule_requests}
- Waste cost (30d): ${money(snap.operations.waste_total_30d_cents)}

TOP PRODUCTS (30d by revenue):
${snap.top_products.map((p, i) => `${i + 1}. ${p.name} — ${p.order_count} orders, ${money(p.revenue_cents)}`).join("\n") || "No data"}

RECENT WASTE (30d):
${snap.recent_waste.map((w) => `- ${w.name} (${w.reason}): ${money(w.total_cost_cents)} on ${w.waste_date}`).join("\n") || "No waste logged"}`;
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Hermes Agent bridge — secure, read-heavy API for AI agent management.
 *
 * Auth: X-Agent-Key header must match AGENT_API_KEY env var.
 * This endpoint deliberately avoids exposing PII (no customer names,
 * emails, or payment data). All monetary values are aggregated.
 */

function authenticate(req: NextRequest): boolean {
  const key = req.headers.get("x-agent-key");
  const expected = process.env.AGENT_API_KEY;
  if (!expected) return false;
  return key === expected;
}

type AgentAction =
  | "status"
  | "marketing_summary"
  | "schedule_post"
  | "catalog_overview"
  | "recent_orders"
  | "insights";

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action: AgentAction; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;
  const db = supabaseAdmin();

  try {
    switch (action) {
      case "status":
        return await handleStatus(db);
      case "marketing_summary":
        return await handleMarketingSummary(db);
      case "schedule_post":
        return await handleSchedulePost(db, body.params ?? {});
      case "catalog_overview":
        return await handleCatalogOverview(db);
      case "recent_orders":
        return await handleRecentOrders(db, body.params ?? {});
      case "insights":
        return await handleInsights(db);
      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            available_actions: [
              "status",
              "marketing_summary",
              "schedule_post",
              "catalog_overview",
              "recent_orders",
              "insights",
            ],
          },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Agent API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Status ──────────────────────────────────────────────────────────
async function handleStatus(db: ReturnType<typeof supabaseAdmin>) {
  const now = new Date();
  const cst = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const hour = cst.getHours();
  const isOpen = hour >= 7 && hour < 17; // 7am-5pm CST daily

  const today = now.toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00Z`;
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [
    { count: todayOrders },
    { data: todayRevenueRows },
    { count: weekOrders },
    { data: weekRevenueRows },
    { count: totalCustomers },
    { count: activeProducts },
    { count: pendingOrders },
    { count: scheduledPosts },
  ] = await Promise.all([
    db.from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    db.from("orders").select("total_cents").gte("created_at", todayStart).in("status", ["confirmed", "processing", "shipped", "delivered"]),
    db.from("orders").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    db.from("orders").select("total_cents").gte("created_at", weekAgo).in("status", ["confirmed", "processing", "shipped", "delivered"]),
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "confirmed", "processing"]),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
  ]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const todayRev = (todayRevenueRows ?? []).reduce((s, r) => s + (r.total_cents || 0), 0);
  const weekRev = (weekRevenueRows ?? []).reduce((s, r) => s + (r.total_cents || 0), 0);

  return NextResponse.json({
    store: {
      name: "Kynda Coffee",
      location: "4315 FM 2147, Horseshoe Bay, TX 78657",
      hours: "7am–5pm daily",
      currently_open: isOpen,
      local_time: cst.toISOString(),
    },
    today: {
      orders: todayOrders ?? 0,
      revenue: fmt(todayRev),
      revenue_cents: todayRev,
    },
    week: {
      orders: weekOrders ?? 0,
      revenue: fmt(weekRev),
      revenue_cents: weekRev,
    },
    totals: {
      customers: totalCustomers ?? 0,
      active_products: activeProducts ?? 0,
      pending_orders: pendingOrders ?? 0,
      scheduled_social_posts: scheduledPosts ?? 0,
    },
  });
}

// ── Marketing Summary ───────────────────────────────────────────────
async function handleMarketingSummary(db: ReturnType<typeof supabaseAdmin>) {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [
    { data: recentPosts },
    { data: scheduled },
    { count: totalPublished },
    { count: totalFailed },
  ] = await Promise.all([
    db.from("social_posts")
      .select("id, platform, text, status, published_at, created_at")
      .eq("status", "published")
      .gte("published_at", weekAgo)
      .order("published_at", { ascending: false })
      .limit(10),
    db.from("social_posts")
      .select("id, platform, text, scheduled_at")
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true })
      .limit(10),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return NextResponse.json({
    published_this_week: recentPosts ?? [],
    scheduled_upcoming: scheduled ?? [],
    totals: {
      published_all_time: totalPublished ?? 0,
      failed: totalFailed ?? 0,
    },
  });
}

// ── Schedule Post ───────────────────────────────────────────────────
async function handleSchedulePost(
  db: ReturnType<typeof supabaseAdmin>,
  params: Record<string, unknown>
) {
  const { platform, text, scheduled_at, image_url } = params;

  if (!platform || !text) {
    return NextResponse.json(
      { error: "platform and text are required" },
      { status: 400 }
    );
  }

  const validPlatforms = ["instagram", "twitter", "facebook"];
  if (!validPlatforms.includes(platform as string)) {
    return NextResponse.json(
      { error: `platform must be one of: ${validPlatforms.join(", ")}` },
      { status: 400 }
    );
  }

  const insertData = {
    platform: platform as string,
    text: text as string,
    status: scheduled_at ? "scheduled" : "draft",
    scheduled_at: scheduled_at ? new Date(scheduled_at as string).toISOString() : null,
    image_url: image_url as string | null,
    user_id: null, // agent-scheduled, not user-scheduled
  };

  const { data, error } = await db
    .from("social_posts")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    post: data,
    message: scheduled_at ? "Post scheduled successfully" : "Draft created",
  });
}

// ── Catalog Overview ────────────────────────────────────────────────
async function handleCatalogOverview(db: ReturnType<typeof supabaseAdmin>) {
  const [
    { data: products },
    { data: lowStock },
  ] = await Promise.all([
    db.from("products")
      .select("id, name, category, price_cents, is_active, stock_quantity")
      .eq("is_active", true)
      .order("category"),
    db.from("products")
      .select("id, name, stock_quantity")
      .eq("is_active", true)
      .lt("stock_quantity", 5)
      .order("stock_quantity"),
  ]);

  // Aggregate by category
  const categories: Record<string, { count: number; avg_price: number }> = {};
  for (const p of products ?? []) {
    const cat = p.category || "other";
    if (!categories[cat]) categories[cat] = { count: 0, avg_price: 0 };
    categories[cat].count++;
    categories[cat].avg_price += p.price_cents || 0;
  }
  for (const cat of Object.keys(categories)) {
    categories[cat].avg_price = Math.round(
      categories[cat].avg_price / categories[cat].count
    );
  }

  return NextResponse.json({
    total_products: (products ?? []).length,
    categories,
    low_stock_items: (lowStock ?? []).map((item) => ({
      name: item.name,
      stock: item.stock_quantity,
    })),
  });
}

// ── Recent Orders ───────────────────────────────────────────────────
async function handleRecentOrders(
  db: ReturnType<typeof supabaseAdmin>,
  params: Record<string, unknown>
) {
  const limit = Math.min((params.limit as number) || 10, 50);

  const { data: orders } = await db
    .from("orders")
    .select("id, status, total_cents, fulfillment_mode, created_at, items")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Strip PII — only expose aggregate data
  const sanitized = (orders ?? []).map((order) => ({
    id: order.id,
    status: order.status,
    total: `$${((order.total_cents || 0) / 100).toFixed(2)}`,
    fulfillment_mode: order.fulfillment_mode,
    item_count: (order.items as Array<unknown> | null)?.length ?? 0,
    created_at: order.created_at,
  }));

  return NextResponse.json({ orders: sanitized });
}

// ── Insights ────────────────────────────────────────────────────────
async function handleInsights(db: ReturnType<typeof supabaseAdmin>) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString();

  const [
    { data: recentOrders },
    { data: allProducts },
    { count: newCustomers },
  ] = await Promise.all([
    db.from("orders")
      .select("created_at, total_cents, items, fulfillment_mode, status")
      .gte("created_at", thirtyDaysAgo)
      .in("status", ["confirmed", "processing", "shipped", "delivered"]),
    db.from("products")
      .select("name, category, price_cents, is_active"),
    db.from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);

  // Top products by units sold
  const productSales: Record<string, { name: string; units: number; revenue: number }> = {};
  const hourBuckets = new Array(24).fill(0);
  const dayBuckets = new Array(7).fill(0); // 0=Sun
  const fulfillmentCounts: Record<string, number> = {};
  let totalRevenue = 0;

  for (const order of recentOrders ?? []) {
    totalRevenue += order.total_cents || 0;
    const d = new Date(order.created_at);
    hourBuckets[d.getUTCHours()]++;
    dayBuckets[d.getUTCDay()]++;

    const mode = order.fulfillment_mode || "unknown";
    fulfillmentCounts[mode] = (fulfillmentCounts[mode] || 0) + 1;

    for (const item of (order.items as Array<{ product_name?: string; quantity?: number; total_cents?: number }>) ?? []) {
      const name = item.product_name ?? "Unknown";
      if (!productSales[name]) productSales[name] = { name, units: 0, revenue: 0 };
      productSales[name].units += item.quantity ?? 1;
      productSales[name].revenue += item.total_cents ?? 0;
    }
  }

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const peakDay = dayNames[dayBuckets.indexOf(Math.max(...dayBuckets))];

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return NextResponse.json({
    period: "Last 30 days",
    revenue: {
      total: fmt(totalRevenue),
      total_cents: totalRevenue,
      avg_per_order: recentOrders?.length ? fmt(totalRevenue / recentOrders.length) : "$0.00",
    },
    orders: {
      total: (recentOrders ?? []).length,
      by_fulfillment: fulfillmentCounts,
    },
    top_products: topProducts.map((p) => ({
      name: p.name,
      units_sold: p.units,
      revenue: fmt(p.revenue),
    })),
    patterns: {
      peak_hour_utc: peakHour,
      peak_day: peakDay,
      peak_hour_note: "UTC — subtract 5-6h for CST",
    },
    growth: {
      new_customers_30d: newCustomers ?? 0,
      active_products: (allProducts ?? []).filter((p) => p.is_active).length,
    },
  });
}

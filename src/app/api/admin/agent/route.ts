import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  isMenuMetricsConfigured,
  createRecipe,
  createIngredient,
  type CreateRecipeInput,
  type CreateIngredientInput,
} from "@/lib/menumetrics/client";
import {
  computePriceTrends,
  formatPriceWatchSummary,
  type VendorPriceSnapshot,
} from "@/lib/menumetrics/price-watch";

export const dynamic = "force-dynamic";

/**
 * Hermes Agent bridge — secure, read-heavy API for AI agent management.
 *
 * Auth: X-Agent-Key header must match AGENT_API_KEY env var.
 * This endpoint deliberately avoids exposing PII (no customer names,
 * emails, or payment data). All monetary values are aggregated.
 */

function authenticate(req: NextRequest): boolean {
  // Primary: X-Agent-Key header matching AGENT_API_KEY
  const key = req.headers.get("x-agent-key");
  const expected = process.env.AGENT_API_KEY;
  if (expected && key === expected) return true;

  // Fallback: CRON_SECRET via Authorization Bearer (shared with other cron endpoints)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  return false;
}

type AgentAction =
  | "status"
  | "marketing_summary"
  | "marketing_dashboard"
  | "schedule_post"
  | "catalog_overview"
  | "recent_orders"
  | "insights"
  | "menu_costing"
  | "price_watch"
  | "propose_recipe";

export async function GET(req: NextRequest) {
  // GET handler for convenience — same auth, action via ?action= query param.
  // POST is preferred for production (body params), but GET is useful for
  // simple status/insights queries from Hermes crons.
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = new URL(req.url).searchParams.get("action") as AgentAction | null;
  if (!action) {
    return NextResponse.json({ error: "action query param required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  try {
    switch (action) {
      case "status":
        return await handleStatus(db);
      case "marketing_summary":
        return await handleMarketingSummary(db);
      case "marketing_dashboard":
        return await handleMarketingDashboard(db);
      case "insights":
        return await handleInsights(db);
      case "catalog_overview":
        return await handleCatalogOverview(db);
      default:
        return NextResponse.json(
          { error: `Action ${action} not available via GET. Use POST.` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Agent API GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
      case "marketing_dashboard":
        return await handleMarketingDashboard(db);
      case "schedule_post":
        return await handleSchedulePost(db, body.params ?? {});
      case "catalog_overview":
        return await handleCatalogOverview(db);
      case "recent_orders":
        return await handleRecentOrders(db, body.params ?? {});
      case "insights":
        return await handleInsights(db);
      case "menu_costing":
        return await handleMenuCosting(db);
      case "price_watch":
        return await handlePriceWatch(db, body.params ?? {});
      case "propose_recipe":
        return await handleProposeRecipe(body.params ?? {});
      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            available_actions: [
              "status",
              "marketing_summary",
              "marketing_dashboard",
              "schedule_post",
              "catalog_overview",
              "recent_orders",
              "insights",
              "menu_costing",
              "price_watch",
              "propose_recipe",
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

  const validPlatforms = ["instagram", "twitter", "facebook", "tiktok", "bluesky"];
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

// ── Menu Costing (MenuMetrics) ──────────────────────────────────────
// Recipe costs + margins joined against current menu prices where linked.
async function handleMenuCosting(db: ReturnType<typeof supabaseAdmin>) {
  const [{ data: recipes }, { data: stock }, { data: alerts }] = await Promise.all([
    db
      .from("menumetrics_recipe_costs")
      .select("recipe_id, name, yield_servings, cost_per_serving_cents, ingredient_cost_cents, synced_at")
      .order("name"),
    db
      .from("menumetrics_stock")
      .select("ingredient_id, name, on_hand, unit, reorder_threshold, is_low")
      .eq("is_low", true),
    db
      .from("inventory_alerts")
      .select("ingredient_name, alert_type, message, created_at")
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return NextResponse.json({
    configured: isMenuMetricsConfigured(),
    recipes: (recipes ?? []).map((r) => ({
      recipe_id: r.recipe_id,
      name: r.name,
      cost_per_serving: fmt(r.cost_per_serving_cents),
      cost_per_serving_cents: r.cost_per_serving_cents,
      synced_at: r.synced_at,
    })),
    low_stock: (stock ?? []).map((s) => ({
      name: s.name,
      on_hand: s.on_hand,
      unit: s.unit,
      reorder_threshold: s.reorder_threshold,
    })),
    open_alerts: alerts ?? [],
  });
}

// ── Vendor Price Watch ──────────────────────────────────────────────
// Trend analysis over vendor_prices history. Report-only: switching
// vendors always requires owner approval.
async function handlePriceWatch(
  db: ReturnType<typeof supabaseAdmin>,
  params: Record<string, unknown>
) {
  const windowDays = Math.min(Math.max(Number(params.window_days) || 90, 7), 365);
  const since = new Date(Date.now() - windowDays * 864e5).toISOString();

  const { data: snapshots } = await db
    .from("vendor_prices")
    .select("ingredient_id, ingredient_name, vendor, pack_size, unit, cost_cents, captured_at")
    .gte("captured_at", since)
    .order("captured_at", { ascending: true })
    .limit(5000);

  const report = computePriceTrends((snapshots ?? []) as VendorPriceSnapshot[], windowDays);
  return NextResponse.json({
    summary: formatPriceWatchSummary(report),
    report,
  });
}

// ── Propose Recipe (agent-native menu R&D) ──────────────────────────
// Creates an agent-proposed recipe in MenuMetrics (optionally creating new
// ingredients first) and returns the computed cost + suggested price.
// The recipe lands tagged "[agent]" in MenuMetrics for owner review — it
// never touches the live menu.
async function handleProposeRecipe(params: Record<string, unknown>) {
  if (!isMenuMetricsConfigured()) {
    return NextResponse.json(
      { error: "MenuMetrics is not configured (MENU_METRICS_URL / MENU_METRICS_TOKEN)." },
      { status: 503 }
    );
  }

  // 1) Optionally create new ingredients the recipe needs.
  const newIngredients = Array.isArray(params.new_ingredients)
    ? (params.new_ingredients as CreateIngredientInput[])
    : [];
  const createdIngredients: Array<{ id: string; name: string }> = [];
  for (const input of newIngredients) {
    const created = await createIngredient(input);
    if (created) createdIngredients.push(created);
  }

  // 2) Create the recipe. Lines may reference existing ingredient ids or
  //    the just-created ones by name (resolve client-side before calling).
  const recipeInput = params.recipe as CreateRecipeInput | undefined;
  if (!recipeInput?.name) {
    return NextResponse.json(
      {
        error: "params.recipe.name is required",
        expected_shape: {
          new_ingredients: "[{ name, category?, store?, purchase_quantity, purchase_unit, purchase_cost_cents }] (optional)",
          recipe: "{ name, description?, category?, servings?, target_margin_pct?, ingredients: [{ ingredient_id, quantity, unit }] }",
        },
      },
      { status: 400 }
    );
  }

  const recipe = await createRecipe(recipeInput);
  if (!recipe) {
    return NextResponse.json({ error: "MenuMetrics rejected the recipe (check ingredient ids/units)." }, { status: 502 });
  }

  return NextResponse.json({
    created_ingredients: createdIngredients,
    recipe,
    note: "Recipe created in MenuMetrics tagged [agent]. Owner reviews there; nothing was added to the live menu.",
  });
}

// ── Marketing Dashboard ──────────────────────────────────────────────
// Aggregated pipeline stats + platform status for the dashboard UI and
// the Hermes growth-strategy cron. No PII.
async function handleMarketingDashboard(db: ReturnType<typeof supabaseAdmin>) {
  const [
    { count: pendingApproval },
    { count: scheduled },
    { count: published },
    { count: draft },
    { count: failed },
    { count: totalPosts },
    { data: recentPublished },
  ] = await Promise.all([
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "pending_approval"),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
    db.from("social_posts").select("*", { count: "exact", head: true }).eq("status", "failed"),
    db.from("social_posts").select("*", { count: "exact", head: true }),
    db.from("social_posts")
      .select("id, platform, text, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  // Platform connection status — check which env vars are set
  const platforms = [
    { key: "twitter", name: "Twitter/X", configured: !!(process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN) },
    { key: "facebook", name: "Facebook", configured: !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_ACCESS_TOKEN) },
    { key: "instagram", name: "Instagram", configured: !!(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.FACEBOOK_ACCESS_TOKEN) },
    { key: "tiktok", name: "TikTok", configured: !!process.env.TIKTOK_ACCESS_TOKEN },
    { key: "bluesky", name: "Bluesky", configured: !!(process.env.BLUESKY_IDENTIFIER && process.env.BLUESKY_APP_PASSWORD) },
  ];

  return NextResponse.json({
    pipeline: {
      total: totalPosts ?? 0,
      pending_approval: pendingApproval ?? 0,
      scheduled: scheduled ?? 0,
      published: published ?? 0,
      draft: draft ?? 0,
      failed: failed ?? 0,
    },
    platforms,
    recent_published: (recentPublished ?? []).map((p) => ({
      id: p.id,
      platform: p.platform,
      text: p.text,
      published_at: p.published_at,
    })),
  });
}

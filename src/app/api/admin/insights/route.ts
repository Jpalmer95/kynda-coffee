import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateInsights, type InsightInputs } from "@/lib/marketing/insights";
import { isSpecialLive, type Special } from "@/lib/marketing/specials";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

/**
 * Growth Insights API (Roadmap V2 — Epic 5).
 *
 * Gathers business + marketing + ops signals and runs the pure insights engine
 * to produce prioritized, actionable recommendations for the owner. Read-only.
 */
export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

  try {
    // ── Orders → revenue by day, channel split, top products, statuses ──────
    const { data: orders } = await supabase
      .from("orders")
      .select("created_at, total_cents, items, status")
      .gte("created_at", since);

    const revenueByDay: Record<string, number> = {};
    let cafeRevenue = 0;
    let merchRevenue = 0;
    const productSales: Record<string, { name: string; units: number; revenue: number }> = {};

    for (const row of orders ?? []) {
      if (row.status === "confirmed" || row.status === "processing" || row.status === "shipped" || row.status === "delivered") {
        const day = String(row.created_at).split("T")[0];
        revenueByDay[day] = (revenueByDay[day] ?? 0) + (row.total_cents ?? 0);
      }
      for (const item of row.items ?? []) {
        const cat = String(item.category || "");
        const isMerch = cat.includes("merch") || cat === "design_studio" || cat === "brew-gear" || cat === "apothecary";
        const cents = item.total_cents ?? 0;
        if (isMerch) merchRevenue += cents;
        else cafeRevenue += cents;
        const name = item.product_name ?? item.name ?? "Unknown";
        if (!productSales[name]) productSales[name] = { name, units: 0, revenue: 0 };
        productSales[name].units += item.quantity ?? 1;
        productSales[name].revenue += cents;
      }
    }
    const topProducts = Object.values(productSales).sort((a, b) => b.units - a.units).slice(0, 10);

    // Order statuses (all-time, for backlog detection).
    const { data: statusRows } = await supabase.from("orders").select("status");
    const ordersByStatus: Record<string, number> = {};
    for (const r of statusRows ?? []) ordersByStatus[r.status] = (ordersByStatus[r.status] ?? 0) + 1;

    // ── New customers by day ────────────────────────────────────────────────
    const { data: newCustomers } = await supabase.from("profiles").select("created_at").gte("created_at", since);
    const customersByDay: Record<string, number> = {};
    for (const r of newCustomers ?? []) {
      const day = String(r.created_at).split("T")[0];
      customersByDay[day] = (customersByDay[day] ?? 0) + 1;
    }

    // ── Marketing signals ───────────────────────────────────────────────────
    const { data: specials } = await supabase.from("specials").select("is_active, starts_at, ends_at").eq("is_active", true);
    const liveSpecialsCount = (specials ?? []).filter((s) => isSpecialLive(s as Pick<Special, "is_active" | "starts_at" | "ends_at">)).length;

    const { count: pendingApprovalCount } = await supabase
      .from("social_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval");

    const { count: activeSubscribers } = await supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("subscribed", true);

    const { data: lastSent } = await supabase
      .from("newsletters")
      .select("sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(1);
    const lastNewsletterDaysAgo =
      lastSent && lastSent[0]?.sent_at
        ? Math.floor((Date.now() - new Date(lastSent[0].sent_at as string).getTime()) / DAY_MS)
        : null;

    // ── Inventory (low stock) — best-effort; table may be empty pre-sync ────
    let lowStockCount = 0;
    const { count: lowStock } = await supabase
      .from("inventory_alerts")
      .select("*", { count: "exact", head: true })
      .eq("acknowledged", false)
      .eq("alert_type", "low_stock");
    if (typeof lowStock === "number") lowStockCount = lowStock;

    const inputs: InsightInputs = {
      revenueByDay,
      topProducts,
      cafeRevenue30d: cafeRevenue,
      merchRevenue30d: merchRevenue,
      customersByDay,
      ordersByStatus,
      liveSpecialsCount,
      pendingApprovalCount: pendingApprovalCount ?? 0,
      activeSubscribers: activeSubscribers ?? 0,
      lastNewsletterDaysAgo,
      lowStockCount,
    };

    const insights = generateInsights(inputs);

    return NextResponse.json({
      insights,
      signals: {
        revenue_30d: cafeRevenue + merchRevenue,
        cafe_revenue_30d: cafeRevenue,
        merch_revenue_30d: merchRevenue,
        live_specials: liveSpecialsCount,
        pending_approvals: pendingApprovalCount ?? 0,
        active_subscribers: activeSubscribers ?? 0,
        last_newsletter_days_ago: lastNewsletterDaysAgo,
        low_stock: lowStockCount,
        top_products: topProducts.slice(0, 5),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to compute insights", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

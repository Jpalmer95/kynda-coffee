import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find customer
    const { data: customer } = await supabaseAdmin()
      .from("customers")
      .select("id, email, loyalty_points, loyalty_tier, total_spent_cents, total_orders")
      .eq("email", email)
      .single();

    if (!customer) {
      return NextResponse.json({
        points: 0,
        tier: "bronze",
        total_spent_cents: 0,
        total_orders: 0,
        next_tier: "silver",
        points_to_next_tier: 500,
      });
    }

    // Get recent transactions
    const { data: transactions } = await supabaseAdmin()
      .from("loyalty_transactions")
      .select("points, type, description, created_at")
      .eq("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(20);

    // Tier thresholds
    const tierThresholds: Record<string, number> = {
      bronze: 0,
      silver: 500,
      gold: 1500,
      "kynda-vip": 3000,
    };

    const currentTier = customer.loyalty_tier ?? "bronze";
    const currentPoints = customer.loyalty_points ?? 0;

    // Find next tier
    const tierOrder = ["bronze", "silver", "gold", "kynda-vip"];
    const currentIdx = tierOrder.indexOf(currentTier);
    const nextTier = currentIdx < tierOrder.length - 1 ? tierOrder[currentIdx + 1] : null;
    const pointsToNext = nextTier ? Math.max(0, (tierThresholds[nextTier] ?? 0) - currentPoints) : 0;

    return NextResponse.json({
      email: customer.email,
      points: currentPoints,
      tier: currentTier,
      total_spent_cents: customer.total_spent_cents ?? 0,
      total_orders: customer.total_orders ?? 0,
      next_tier: nextTier,
      points_to_next_tier: pointsToNext,
      transactions: transactions ?? [],
    });
  } catch (err) {
    console.error("Loyalty balance error:", err);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}

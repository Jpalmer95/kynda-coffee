import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireTier } from "@/lib/auth/team";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    // Fetch profiles + order aggregates
    const { data: profiles, error } = await supabaseAdmin()
      .from("profiles")
      .select("id, full_name, email, loyalty_points, loyalty_tier, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Customers fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }

    // Fetch order counts per email
    const { data: orders, error: ordersError } = await supabaseAdmin()
      .from("orders")
      .select("email, total_cents");

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
    }

    const orderMap = new Map<string, { count: number; spent: number }>();
    orders?.forEach((o) => {
      const existing = orderMap.get(o.email) || { count: 0, spent: 0 };
      existing.count += 1;
      existing.spent += o.total_cents;
      orderMap.set(o.email, existing);
    });

    let customers = (profiles || []).map((p) => {
      const stats = orderMap.get(p.email) || { count: 0, spent: 0 };
      return {
        id: p.id,
        name: p.full_name || "—",
        email: p.email,
        joined: p.created_at,
        orders: stats.count,
        totalSpent: stats.spent,
        loyaltyPoints: (p as any).loyalty_points ?? 0,
        loyaltyTier: (p as any).loyalty_tier ?? "bronze",
      };
    });

    if (q) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ customers });
  } catch {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

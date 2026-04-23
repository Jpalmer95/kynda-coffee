import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: orders } = await supabaseAdmin()
      .from("orders")
      .select("*");

    const rows = (orders ?? []).map((o) => ({
      order_number: o.order_number,
      email: o.email,
      status: o.status,
      source: o.source,
      subtotal: (o.subtotal_cents / 100).toFixed(2),
      tax: (o.tax_cents / 100).toFixed(2),
      shipping: (o.shipping_cents / 100).toFixed(2),
      total: (o.total_cents / 100).toFixed(2),
      items: (o.items ?? []).map((i: any) => `${i.product_name}×${i.quantity}`).join("; "),
      created: o.created_at,
    }));

    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

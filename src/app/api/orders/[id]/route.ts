import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Verify ownership (require non-empty normalized email match or matching customer_id)
  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const orderEmail = typeof order.email === "string" ? order.email.trim().toLowerCase() : "";
  const profileEmail = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
  const userEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const ownsByCustomerId = Boolean((order as any).customer_id && (order as any).customer_id === user.id);
  const ownsByEmail = Boolean(orderEmail && (orderEmail === profileEmail || orderEmail === userEmail));

  if (!ownsByCustomerId && !ownsByEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ order });
}

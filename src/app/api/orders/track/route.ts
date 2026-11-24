import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit: 10 lookups per IP per hour
  const ip = getClientIp(req);
  const { allowed, remaining } = checkRateLimit(`order-track:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const { email, orderNumber } = await req.json();

    if (!email || !orderNumber) {
      return NextResponse.json(
        { error: "Email and order number are required." },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .select(
        "id, order_number, status, payment_status, fulfillment_status, items, subtotal_cents, tax_cents, shipping_cents, total_cents, created_at, updated_at"
      )
      .eq("order_number", String(orderNumber).trim().toUpperCase())
      .eq("email", String(email).trim().toLowerCase())
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found. Please check your email and order number." },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

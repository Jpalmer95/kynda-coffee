import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { buildShippingLabelPlan, type ShippedOrderLine } from "@/lib/shipping/auto-label";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/shipping/auto-label
 * Generates a thermal label (ZPL + carrier preset) and returns packaging SKU
 * decrements so packing materials auto-resupply through the Amazon/HEB order engine.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    order_id?: string;
    recipient_name?: string;
    city_state_zip?: string;
    lines?: ShippedOrderLine[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lines = Array.isArray(body.lines) && body.lines.length > 0
    ? body.lines
    : [{ name: "House Blend 12oz Coffee Beans", quantity: 1, category: "coffee-beans" }];

  const plan = buildShippingLabelPlan({
    orderId: body.order_id || `KYN-${Date.now().toString().slice(-6)}`,
    recipientName: body.recipient_name || "Kynda Guest",
    cityStateZip: body.city_state_zip || "Horseshoe Bay, TX 78657",
    lines,
  });

  return NextResponse.json({
    success: true,
    plan,
  });
}

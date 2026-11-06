import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/vendor/intake
 * Scoped Vendor & Event Partner Agent Intake.
 *
 * Allows suppliers (roasters, dairy/grocery, packaging) and local event partners
 * (musicians, pop-up vendors) or their AI agents to submit:
 *  - delivery_eta (updates shift lead dashboard)
 *  - invoice_price_update (feeds price_watch & owner review — never auto-switches vendors)
 *  - event_proposal (routes to Manager/Owner event queue)
 *  - stock_alert (alerts purchasing engine)
 *
 * Zero internal store data is exposed.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(ip, {
    identifier: "vendor-intake",
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many vendor intake requests. Please wait a minute." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vendorName = String(body.vendor_name ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  if (!vendorName || !summary) {
    return NextResponse.json(
      { error: "vendor_name and summary are required" },
      { status: 400 }
    );
  }

  const validTypes = [
    "roaster",
    "grocery_dairy",
    "packaging",
    "bakery",
    "event_musician",
    "maintenance",
    "other",
  ];
  const validIntakes = [
    "delivery_eta",
    "invoice_price_update",
    "event_proposal",
    "stock_alert",
  ];

  const vendorType = validTypes.includes(String(body.vendor_type))
    ? String(body.vendor_type)
    : "other";
  const intakeType = validIntakes.includes(String(body.intake_type))
    ? String(body.intake_type)
    : "delivery_eta";

  const payload = {
    vendor_name: vendorName.slice(0, 120),
    vendor_type: vendorType,
    intake_type: intakeType,
    contact_email: typeof body.contact_email === "string" ? body.contact_email.slice(0, 120) : null,
    summary: summary.slice(0, 1000),
    payload: typeof body.payload === "object" && body.payload !== null ? body.payload : {},
    status: "pending",
  };

  let savedId = `vendor-${Date.now()}`;
  try {
    const { data } = await supabaseAdmin()
      .from("vendor_intakes")
      .insert(payload)
      .select("id")
      .single();
    if (data?.id) savedId = data.id;
  } catch {
    // Graceful fallback if migration 057 is not yet applied
  }

  return NextResponse.json({
    success: true,
    intake_id: savedId,
    status: "pending",
    message:
      intakeType === "invoice_price_update"
        ? "Price notice logged for Kynda Price Watch & Owner review."
        : intakeType === "event_proposal"
        ? "Event proposal queued for Kynda Leadership review."
        : "Delivery/vendor update routed to the Kynda Shift Lead & Command Center.",
  });
}

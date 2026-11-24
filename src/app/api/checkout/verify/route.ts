import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "checkout-verify", windowMs: 60_000, maxRequests: 15 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
      return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
    }

    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const shippingName = (session as any).shipping_details?.name ?? session.customer_details?.name ?? null;

    // Never return raw street address or unmasked PII on an unauthenticated endpoint
    return NextResponse.json({
      session: {
        id: session.id,
        customer_email: maskEmail(session.customer_email || session.customer_details?.email),
        amount_total: session.amount_total,
        shipping_details: shippingName ? { name: shippingName } : undefined,
        payment_status: session.payment_status,
      },
    });
  } catch (err) {
    console.error("Verify checkout error:", err);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const session = await stripe().checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      session: {
        id: session.id,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        shipping_details: session.shipping_details,
        payment_status: session.payment_status,
      },
    });
  } catch (err) {
    console.error("Verify checkout error:", err);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}

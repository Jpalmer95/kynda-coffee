import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

// Force dynamic — needs runtime env vars
export const dynamic = "force-dynamic";

const validateSchema = z.object({
  email: z.string().email(),
  points_to_redeem: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateSchema.parse(body);

    // Find customer by email
    const { data: customer, error } = await supabaseAdmin()
      .from("customers")
      .select("id, points, tier, email")
      .eq("email", parsed.email)
      .single();

    if (error || !customer) {
      return NextResponse.json({ points: 0, tier: "Bronze", valid: false, message: "Customer not found" });
    }

    const availablePoints = customer.points || 0;
    const requested = parsed.points_to_redeem || 0;

    // Simple redemption rate: 100 points = $5 (500 cents)
    const POINT_VALUE_CENTS = 5; // cents per point
    const maxRedeemableValue = availablePoints * POINT_VALUE_CENTS;

    let redeemableCents = 0;
    let pointsUsed = 0;

    if (requested > 0) {
      pointsUsed = Math.min(requested, availablePoints);
      redeemableCents = pointsUsed * POINT_VALUE_CENTS;
    }

    return NextResponse.json({
      valid: true,
      points: availablePoints,
      tier: customer.tier,
      max_redeemable_cents: maxRedeemableValue,
      points_used: pointsUsed,
      redeemable_cents: redeemableCents,
      rate: "100 points = $5",
    });
  } catch (err) {
    console.error("Loyalty validate error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
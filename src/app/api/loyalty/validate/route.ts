import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { STORE_CONFIG } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

const validateSchema = z.object({
  email: z.string().email(),
  points_to_redeem: z.number().int().min(0).optional(),
  subtotal_cents: z.number().int().min(0).optional(),
});

// Redemption rate: 100 points = $5 (500 cents)
const POINTS_PER_CENT = 100 / 500; // 0.2 points per cent
const CENTS_PER_POINT = 500 / 100; // 5 cents per point

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateSchema.parse(body);

    // Find or create customer by email
    let { data: customer } = await supabaseAdmin()
      .from("customers")
      .select("id, loyalty_points, loyalty_tier, total_spent_cents")
      .eq("email", parsed.email)
      .single();

    if (!customer) {
      // Create a new customer record for loyalty tracking
      const { data: newCustomer, error: insertError } = await supabaseAdmin()
        .from("customers")
        .insert({
          email: parsed.email,
          loyalty_points: 0,
          loyalty_tier: "bronze",
        })
        .select("id, loyalty_points, loyalty_tier, total_spent_cents")
        .single();

      if (insertError) {
        return NextResponse.json({ error: "Failed to create customer record" }, { status: 500 });
      }
      customer = newCustomer;
    }

    const availablePoints = customer.loyalty_points ?? 0;
    const tier = customer.loyalty_tier ?? "bronze";

    // Max redeemable is the lesser of: available points, or subtotal in points equivalent
    const maxRedeemableCents = parsed.subtotal_cents ?? Infinity;
    const maxRedeemablePoints = Math.floor(maxRedeemableCents / CENTS_PER_POINT);
    const effectiveMaxPoints = Math.min(availablePoints, maxRedeemablePoints);

    // Response
    const response: any = {
      valid: true,
      points: availablePoints,
      tier,
      rate: "100 pts = $5.00",
      cents_per_point: CENTS_PER_POINT,
      max_redeemable_points: effectiveMaxPoints,
      max_redeemable_cents: effectiveMaxPoints * CENTS_PER_POINT,
    };

    // If points_to_redeem provided, validate and calculate value
    if (parsed.points_to_redeem !== undefined) {
      if (parsed.points_to_redeem > availablePoints) {
        response.valid = false;
        response.message = `You only have ${availablePoints} points available.`;
      } else if (parsed.points_to_redeem > effectiveMaxPoints) {
        response.valid = false;
        response.message = `Maximum redeemable for this order is ${effectiveMaxPoints} points (${(effectiveMaxPoints * CENTS_PER_POINT / 100).toFixed(2)}).`;
      } else {
        response.points_used = parsed.points_to_redeem;
        response.redeemable_cents = parsed.points_to_redeem * CENTS_PER_POINT;
        response.message = `Redeem ${parsed.points_to_redeem} points for $${(response.redeemable_cents / 100).toFixed(2)}`;
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("Loyalty validation error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}

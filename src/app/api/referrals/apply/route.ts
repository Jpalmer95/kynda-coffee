import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  referral_code: z.string(),
  customer_email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    // Validate the referral code
    const validateRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/referrals/validate`, {
      method: "POST",
      body: JSON.stringify({ code: parsed.referral_code, email: parsed.customer_email }),
    });
    const validateData = await validateRes.json();

    if (!validateData.valid) {
      return NextResponse.json({ valid: false, error: validateData.reason }, { status: 400 });
    }

    // Record the referral intent (pending until first purchase completes)
    await supabaseAdmin()
      .from("referrals")
      .insert({
        referrer_id: validateData.referrer_id,
        referee_email: parsed.customer_email,
        referral_code: parsed.referral_code,
        status: "pending",
      });

    return NextResponse.json({ valid: true, discount_percent: 10 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

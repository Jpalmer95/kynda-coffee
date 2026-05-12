import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { code, email } = await req.json();

    if (!code || !email) {
      return NextResponse.json(
        { error: "Referral code and email are required" },
        { status: 400 }
      );
    }

    const cleanCode = code.toString().trim().toUpperCase();

    // Find valid active referral code
    const { data: referralCode } = await supabase
      .from("referral_codes")
      .select("id, customer_id, code, is_active, expires_at")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .single();

    if (!referralCode) {
      return NextResponse.json(
        { valid: false, reason: "Referral code not found or inactive" },
        { status: 200 }
      );
    }

    // Prevent self-referral
    const { data: referrer } = await supabase
      .from("customers")
      .select("email")
      .eq("id", referralCode.customer_id)
      .single();

    if (referrer?.email?.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { valid: false, reason: "You cannot use your own referral code" },
        { status: 200 }
      );
    }

    // Check expiry
    if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, reason: "Referral code has expired" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: referralCode.code,
      discount_percent: 10, // 10% first-order discount as specified
      referrer_id: referralCode.customer_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

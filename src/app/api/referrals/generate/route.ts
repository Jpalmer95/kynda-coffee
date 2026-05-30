import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

// Simple code generator (KYND-XXXX-YY)
function generateReferralCode(email: string): string {
  const prefix = "KYND";
  const short = email.split("@")[0].slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${short}-${suffix}`;
}

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "referrals-generate", windowMs: 60_000, maxRequests: 5 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await req.json();
    const { email } = schema.parse(body);

    // Find or create customer record
    let { data: customer } = await supabaseAdmin()
      .from("customers")
      .select("id, referral_code")
      .eq("email", email)
      .single();

    if (!customer) {
      const { data: newCustomer } = await supabaseAdmin()
        .from("customers")
        .insert({ email, full_name: email.split("@")[0] })
        .select()
        .single();
      customer = newCustomer;
    }

    if (!customer) {
      return NextResponse.json({ error: "Failed to locate or create customer account" }, { status: 500 });
    }

    if (customer.referral_code) {
      return NextResponse.json({ code: customer.referral_code });
    }

    // Generate new code
    const newCode = generateReferralCode(email);

    await supabaseAdmin()
      .from("referral_codes")
      .insert({ customer_id: customer.id, code: newCode });

    // Backfill on customer row for convenience
    await supabaseAdmin()
      .from("customers")
      .update({ referral_code: newCode })
      .eq("id", customer.id);

    return NextResponse.json({ code: newCode });
  } catch (err) {
    console.error("[referrals/generate]", err);
    return NextResponse.json({ error: "Failed to generate referral code" }, { status: 500 });
  }
}

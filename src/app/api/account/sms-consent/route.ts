import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * SMS consent management for A2P 10DLC compliance.
 *
 * GET  — returns the logged-in user's SMS consent status
 * POST — sets sms_opt_in (true/false) and records the timestamp
 *
 * Consent is stored on the profiles table so it persists across sessions
 * and orders. When a customer checks the consent box at checkout, the
 * order submit API also calls this to update the profile — so subsequent
 * orders auto-check the box.
 *
 * Customers can revoke consent by:
 *  1. Toggling it off in /account/notifications
 *  2. Replying STOP to any SMS (Twilio webhook updates the profile)
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("sms_opt_in, sms_opt_in_at, sms_opt_out_at, phone")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    sms_opt_in: profile?.sms_opt_in ?? false,
    sms_opt_in_at: profile?.sms_opt_in_at ?? null,
    sms_opt_out_at: profile?.sms_opt_out_at ?? null,
    phone: profile?.phone ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const consent = body.consent === true;

  const update: {
    sms_opt_in: boolean;
    sms_opt_in_at: string | null;
    sms_opt_out_at: string | null;
    updated_at: string;
  } = {
    sms_opt_in: consent,
    sms_opt_in_at: consent ? new Date().toISOString() : null,
    sms_opt_out_at: !consent ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also sync to customers table (if a customer record exists for this email)
  const { data: { user: userFresh } } = await supabase.auth.getUser();
  if (userFresh?.email) {
    await supabaseAdmin()
      .from("customers")
      .update({ sms_opt_in: consent })
      .eq("email", userFresh.email.toLowerCase());
  }

  return NextResponse.json({ success: true, sms_opt_in: consent });
}

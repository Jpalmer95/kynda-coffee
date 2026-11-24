import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCanonicalAppUrl } from "@/lib/auth/security";

export const dynamic = "force-dynamic";

const E164_REGEX = /^\+?[0-9]{10,15}$/;

/**
 * Twilio SMS webhook for STOP/START/HELP keyword processing.
 *
 * Verifies X-Twilio-Signature (HMAC-SHA1) against TWILIO_AUTH_TOKEN before
 * processing any opt-in/opt-out updates, and strictly validates E.164 phone
 * format to prevent PostgREST filter injection.
 */
export async function POST(req: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("[Twilio SMS Webhook] TWILIO_AUTH_TOKEN not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const signature = req.headers.get("x-twilio-signature") ?? "";
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      params[k] = String(v);
    }

    const webhookUrl = `${getCanonicalAppUrl()}/api/webhooks/twilio/sms`;
    const isValid =
      twilio.validateRequest(authToken, signature, webhookUrl, params) ||
      twilio.validateRequest(authToken, signature, req.url, params);

    if (!isValid) {
      console.warn("[Twilio SMS Webhook] Invalid X-Twilio-Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const from = (params.From ?? "").trim();
    const body = (params.Body ?? "").trim().toUpperCase();

    if (!from || !E164_REGEX.test(from)) {
      return NextResponse.json({ error: "Invalid From phone number" }, { status: 400 });
    }

    // Normalize phone to digits-only format (strip leading +1 or +)
    const normalizedPhone = from.replace(/^\+1/, "").replace(/^\+/, "");
    const phoneVariants = [normalizedPhone, `+1${normalizedPhone}`, `+${normalizedPhone}`];

    // Detect opt-out keywords (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT)
    const isOptOut = /^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/.test(body);
    // Detect opt-in keywords (START, YES, UNSTOP)
    const isOptIn = /^(START|YES|UNSTOP|BEGIN)$/.test(body);

    if (!isOptOut && !isOptIn) {
      // Not a keyword we handle — return 200 so Twilio doesn't retry
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();

    if (isOptOut) {
      // Revoke consent on both profiles and customers tables using parameterized .in()
      await supabaseAdmin()
        .from("profiles")
        .update({
          sms_opt_in: false,
          sms_opt_out_at: now,
          updated_at: now,
        })
        .in("phone", phoneVariants);

      await supabaseAdmin()
        .from("customers")
        .update({ sms_opt_in: false })
        .in("phone", phoneVariants);

      // normalizedPhone is strictly [0-9]{10,15} (validated above)
      const { data: pendingOrders } = await supabaseAdmin()
        .from("orders")
        .select("id, fulfillment_metadata")
        .in("status", ["pending", "confirmed", "processing"])
        .or(
          `fulfillment_metadata->>customer_phone.eq.${normalizedPhone},fulfillment_metadata->>customer_phone.eq.+1${normalizedPhone},fulfillment_metadata->>customer_phone.eq.+${normalizedPhone}`
        );

      if (pendingOrders && pendingOrders.length > 0) {
        for (const o of pendingOrders) {
          const fm = (o.fulfillment_metadata as Record<string, unknown>) ?? {};
          await supabaseAdmin()
            .from("orders")
            .update({
              fulfillment_metadata: { ...fm, sms_consent: false },
              updated_at: now,
            })
            .eq("id", o.id);
        }
      }

      console.log(`[Twilio SMS Webhook] Opt-out processed for ${normalizedPhone}`);
    } else if (isOptIn) {
      await supabaseAdmin()
        .from("profiles")
        .update({
          sms_opt_in: true,
          sms_opt_in_at: now,
          updated_at: now,
        })
        .in("phone", phoneVariants);

      await supabaseAdmin()
        .from("customers")
        .update({ sms_opt_in: true })
        .in("phone", phoneVariants);

      console.log(`[Twilio SMS Webhook] Opt-in processed for ${normalizedPhone}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Twilio SMS Webhook] Error:", err);
    return NextResponse.json({ received: true });
  }
}

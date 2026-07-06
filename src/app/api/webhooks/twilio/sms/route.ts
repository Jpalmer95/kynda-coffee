import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Twilio SMS webhook for STOP/START/HELP keyword processing.
 *
 * When a customer replies STOP to an SMS, Twilio fires an inbound message
 * webhook. We use it to automatically revoke SMS consent on the customer's
 * profile — so no future order-status texts are sent.
 *
 * Register this URL in Twilio Console:
 *   Phone Numbers > Manage > Active Numbers > (737) 200-2947
 *   > A Messaging Service > Inbound Settings
 *   Webhook URL: https://kyndacoffee.com/api/webhooks/twilio/sms
 *   Method: POST
 *
 * Twilio also auto-handles STOP/UNSTOP keywords at the carrier level —
 * this webhook is a secondary safety net that updates our database so
 * the KDS "ready" SMS logic (which checks sms_consent) doesn't attempt
 * to send to a customer who has opted out.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = String(formData.get("From") ?? "").trim();
    const body = String(formData.get("Body") ?? "").trim().toUpperCase();

    if (!from) {
      return NextResponse.json({ error: "Missing From" }, { status: 400 });
    }

    // Normalize phone to match our stored format (strip +1 prefix if present)
    const normalizedPhone = from.replace(/^\+1/, "");

    // Detect opt-out keywords (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT)
    const isOptOut = /^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/.test(body);
    // Detect opt-in keywords (START, YES, UNSTOP)
    const isOptIn = /^(START|YES|UNSTOP|BEGIN)$/.test(body);

    if (!isOptOut && !isOptIn) {
      // Not a keyword we handle — return 200 so Twilio doesn't retry
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();

    // Build phone match conditions (try multiple formats)
    const phoneMatch = `phone.eq.${normalizedPhone},phone.eq.+1${normalizedPhone},phone.eq.+${normalizedPhone}`;

    if (isOptOut) {
      // Revoke consent on both profiles and customers tables
      await supabaseAdmin()
        .from("profiles")
        .update({
          sms_opt_in: false,
          sms_opt_out_at: now,
          updated_at: now,
        })
        .or(phoneMatch);

      await supabaseAdmin()
        .from("customers")
        .update({ sms_opt_in: false })
        .or(phoneMatch);

      // Also update the fulfillment_metadata on pending orders for this phone
      // so the KDS "ready" SMS won't fire. We need to fetch and merge since
      // we can't do a nested jsonb field update with the Supabase client.
      const { data: pendingOrders } = await supabaseAdmin()
        .from("orders")
        .select("id, fulfillment_metadata")
        .in("status", ["pending", "confirmed", "processing"])
        .or(`fulfillment_metadata->>customer_phone.eq.${normalizedPhone},fulfillment_metadata->>customer_phone.eq.+1${normalizedPhone},fulfillment_metadata->>customer_phone.eq.+${normalizedPhone}`);

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
        .or(phoneMatch);

      await supabaseAdmin()
        .from("customers")
        .update({ sms_opt_in: true })
        .or(phoneMatch);

      console.log(`[Twilio SMS Webhook] Opt-in processed for ${normalizedPhone}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Twilio SMS Webhook] Error:", err);
    return NextResponse.json({ received: true });
  }
}

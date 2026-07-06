import { NextResponse } from "next/server";
import { getPosCatalog } from "@/lib/pos/catalog";
import { buildQrOrderDraft, type QrOrderDraft, type QrOrderRequest } from "@/lib/orders/qr-order";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { pickupConfirmationHtml, pickupConfirmationSubject } from "@/lib/email/templates/pickup-confirmation";
import { pushOrderToSquare, isSquareOrderPushEnabled } from "@/lib/square/orders";

export const runtime = "nodejs";

function orderChannelForMode(mode: string) {
  if (mode === "table" || mode === "parking" || mode === "lobby") return mode;
  return "pickup";
}

/**
 * Persist SMS consent to the customer's profile when they check the box
 * at checkout. This runs server-side so consent is recorded even for
 * customers whose browser might not have completed the client-side POST
 * (e.g. they submitted the order right after checking the box).
 */
async function persistSmsConsent(email: string, consent: boolean) {
  if (!email || email.endsWith("@kyndacoffee.local") || email === "pending@kyndacoffee.com") return;
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  // Update profiles table (if user has an account)
  await db
    .from("profiles")
    .update({
      sms_opt_in: consent,
      sms_opt_in_at: consent ? now : null,
      sms_opt_out_at: !consent ? now : null,
      updated_at: now,
    })
    .eq("email", email.toLowerCase());

  // Sync to customers table
  await db
    .from("customers")
    .update({ sms_opt_in: consent })
    .eq("email", email.toLowerCase());
}

// The `orders.payment_preference` column has a CHECK constraint that predates
// the `stripe` preference value (migration 010 allows only 'online' |
// 'pay_at_counter' | 'online_later'). Map our app-level preference to a
// constraint-safe column value; the exact preference is still preserved in
// fulfillment_metadata.payment_preference + payment_metadata.initial_preference.
function paymentPreferenceColumnValue(pref: string): string {
  if (pref === "stripe" || pref === "online") return "online";
  if (pref === "online_later") return "online_later";
  return "pay_at_counter";
}

function serializeOrder(draft: QrOrderDraft) {
  return {
    order_number: draft.order_number,
    customer_id: draft.customer_id,
    email: draft.email,
    status: draft.status,
    source: draft.source,
    items: draft.items,
    subtotal_cents: draft.subtotal_cents,
    tax_cents: draft.tax_cents,
    shipping_cents: draft.shipping_cents,
    total_cents: draft.total_cents,
    shipping_address: draft.shipping_address,
    notes: draft.notes,
    fulfillment_metadata: draft.fulfillment_metadata,
    payment_preference: paymentPreferenceColumnValue(draft.fulfillment_metadata.payment_preference),
    order_channel: orderChannelForMode(draft.fulfillment_metadata.mode),
    payment_status: draft.payment_status,
    payment_method: draft.payment_method,
    paid_at: draft.paid_at,
    payment_metadata: draft.payment_metadata,
    submitted_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QrOrderRequest;
    const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true, limit: 500 });
    const draftResult = buildQrOrderDraft(body, catalog.items);

    if (!draftResult.ok) {
      return NextResponse.json({ error: draftResult.error }, { status: 400 });
    }

    const insert = serializeOrder(draftResult.value);
    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .insert(insert as any)
      .select("id, order_number, status, source, total_cents, items, fulfillment_metadata, payment_preference, order_channel, payment_status, payment_method, paid_at, payment_metadata, created_at")
      .single();

    if (error) {
      console.error("QR order insert failed", error);
      return NextResponse.json({ error: "Failed to submit order." }, { status: 500 });
    }

    // Persist SMS consent to the customer's profile (best-effort, non-blocking)
    if (draftResult.value.fulfillment_metadata.sms_consent) {
      const customerEmail = draftResult.value.email;
      persistSmsConsent(customerEmail, true).catch((e) =>
        console.error("[orders/submit] SMS consent persist failed:", e)
      );
    }

    // Best-effort upstream mirror into Square (team sees the order in Square
    // Dashboard/POS alongside walk-up sales). Never blocks the response; the
    // resulting square_order_id is stamped back for echo-loop protection.
    if (isSquareOrderPushEnabled() && order) {
      pushOrderToSquare({
        id: order.id,
        order_number: draftResult.value.order_number,
        items: draftResult.value.items,
        subtotal_cents: draftResult.value.subtotal_cents,
        tax_cents: draftResult.value.tax_cents,
        total_cents: draftResult.value.total_cents,
        notes: draftResult.value.notes,
        fulfillment_metadata: draftResult.value.fulfillment_metadata,
      })
        .then(async (res) => {
          if (res.ok && res.squareOrderId) {
            await supabaseAdmin()
              .from("orders")
              .update({ square_order_id: res.squareOrderId })
              .eq("id", order.id);
          } else if (res.error && res.error !== "square order push not configured") {
            console.error("[orders/submit] Square push failed:", res.error);
          }
        })
        .catch((e) => console.error("[orders/submit] Square push exception:", e));
    }

    // Best-effort pickup confirmation email — never block the order response.
    // Skip the walk-up placeholder address (no real customer email).
    const draft = draftResult.value;
    const fm = draft.fulfillment_metadata as { label?: string; payment_preference?: string; customer_name?: string } | undefined;
    const isRealEmail = draft.email && !draft.email.endsWith("@kyndacoffee.local");
    if (isRealEmail) {
      const pref = fm?.payment_preference ?? "pay_at_counter";
      const payAtCounter = pref !== "stripe" && pref !== "online";
      const html = pickupConfirmationHtml({
        name: fm?.customer_name,
        orderNumber: draft.order_number,
        items: (draft.items || []).map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          total_cents: i.total_cents,
        })),
        totalCents: draft.total_cents,
        fulfillmentLabel: fm?.label,
        payAtCounter,
        notes: draft.notes || undefined,
      });
      sendEmail({
        to: draft.email,
        subject: pickupConfirmationSubject(draft.order_number),
        html,
      }).catch((e) => console.error("Pickup confirmation email failed:", e));
    }

    return NextResponse.json({
      order,
      message: "Order submitted. Please pay at the counter when you arrive unless a team member instructs otherwise.",
    });
  } catch (error) {
    console.error("Order submit error", error);
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getPosCatalog } from "@/lib/pos/catalog";
import { buildQrOrderDraft, type QrOrderRequest } from "@/lib/orders/qr-order";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { pushOrderToSquare, isSquareOrderPushEnabled } from "@/lib/square/orders";
import { sendEmail } from "@/lib/email/send";
import { pickupConfirmationHtml, pickupConfirmationSubject } from "@/lib/email/templates/pickup-confirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/orders — agent-native café order placement.
 *
 * Lets any AI agent place a pickup order on a customer's behalf. Same
 * validation + catalog pipeline as the human QR flow (buildQrOrderDraft), so
 * agents can't order unavailable items, skip required modifiers, or invent
 * prices. Differences from the QR flow:
 *
 *   - source='agent', order_channel='agent' (visible as AGENT on the KDS)
 *   - requires a real customer email or phone (no walk-up placeholder)
 *   - request may carry agent metadata {agent: {name, platform}} for auditing
 *   - response is machine-first: structured order + status URL + payment info
 *
 * Security model: agents can browse and place orders freely, but every agent
 * order is PREPAID-ONLY — the order is held off the kitchen display until the
 * customer completes Stripe Checkout (cash exists only at the physical POS).
 * This kills the no-show/fraud vector entirely: an unpaid order is never
 * prepared. Rate-limited per IP. No stored credentials, no PII beyond what
 * the customer provides for pickup.
 */
const ORDER_SELECT =
  "id, order_number, status, source, order_channel, total_cents, subtotal_cents, tax_cents, items, fulfillment_metadata, payment_status, created_at";

interface AgentOrderRequest extends QrOrderRequest {
  agent?: { name?: string; platform?: string };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, { identifier: "agent-orders", windowMs: 60_000, maxRequests: 10 });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = (await request.json()) as AgentOrderRequest;

    // Agents must provide real contact info — the team needs a name for the
    // cup and the customer needs an order-status handle.
    const email = body.customer?.email?.trim().toLowerCase();
    const phone = body.customer?.phone?.trim();
    if (!email && !phone) {
      return NextResponse.json(
        { error: "customer.email or customer.phone is required for agent orders." },
        { status: 400 }
      );
    }

    const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true, limit: 500 });
    // Agent orders default to counter pickup (the QR flow defaults to lobby).
    // PREPAID-ONLY (owner rule): every remote order must be paid online before
    // the kitchen sees it. Cash is physical-POS only — so the agent flow
    // always forces Stripe regardless of what the caller requested.
    const orderBody: AgentOrderRequest = {
      ...body,
      fulfillment: body.fulfillment ?? { mode: "pickup" },
      paymentPreference: "stripe",
    };
    const draftResult = buildQrOrderDraft(orderBody, catalog.items);
    if (!draftResult.ok) {
      return NextResponse.json({ error: draftResult.error }, { status: 400 });
    }

    const draft = draftResult.value;
    const agentMeta = {
      agent_name: body.agent?.name?.slice(0, 100) ?? "unknown",
      agent_platform: body.agent?.platform?.slice(0, 100) ?? "unknown",
      placed_via: "agent-api",
    };

    const insert = {
      order_number: draft.order_number.replace(/^QR-/, "AG-"),
      customer_id: null,
      email: draft.email,
      status: draft.status,
      source: "agent",
      items: draft.items,
      subtotal_cents: draft.subtotal_cents,
      tax_cents: draft.tax_cents,
      shipping_cents: draft.shipping_cents,
      total_cents: draft.total_cents,
      shipping_address: null,
      notes: draft.notes,
      fulfillment_metadata: { ...draft.fulfillment_metadata, ...agentMeta },
      payment_preference: "online",
      order_channel: "agent",
      payment_status: draft.payment_status,
      payment_method: draft.payment_method,
      paid_at: draft.paid_at,
      payment_metadata: { ...draft.payment_metadata, ...agentMeta },
      submitted_at: new Date().toISOString(),
    };

    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .insert(insert as any)
      .select(ORDER_SELECT)
      .single();

    if (error || !order) {
      console.error("[agent/orders] insert failed", error);
      return NextResponse.json({ error: "Failed to submit order." }, { status: 500 });
    }

    // Mirror upstream into Square so the team sees it there too (best-effort).
    if (isSquareOrderPushEnabled()) {
      pushOrderToSquare({
        id: order.id,
        order_number: order.order_number,
        items: draft.items,
        subtotal_cents: draft.subtotal_cents,
        tax_cents: draft.tax_cents,
        total_cents: draft.total_cents,
        notes: draft.notes,
        fulfillment_metadata: { ...draft.fulfillment_metadata, ...agentMeta },
      })
        .then(async (res) => {
          if (res.ok && res.squareOrderId) {
            await supabaseAdmin()
              .from("orders")
              .update({ square_order_id: res.squareOrderId })
              .eq("id", order.id);
          }
        })
        .catch((e) => console.error("[agent/orders] Square push exception:", e));
    }

    // Best-effort confirmation email when the agent gave us a real address.
    const isRealEmail = draft.email && !draft.email.endsWith("@kyndacoffee.local");
    if (isRealEmail) {
      const html = pickupConfirmationHtml({
        name: draft.fulfillment_metadata.customer_name,
        orderNumber: order.order_number,
        items: draft.items.map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          total_cents: i.total_cents,
        })),
        totalCents: draft.total_cents,
        fulfillmentLabel: draft.fulfillment_metadata.label,
        payAtCounter: false, // agent orders are always prepaid
        notes: draft.notes || undefined,
      });
      sendEmail({
        to: draft.email,
        subject: pickupConfirmationSubject(order.order_number),
        html,
      }).catch((e) => console.error("[agent/orders] confirmation email failed:", e));
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    return NextResponse.json(
      {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_cents: order.total_cents,
          subtotal_cents: order.subtotal_cents,
          payment_status: order.payment_status,
          created_at: order.created_at,
          items: draft.items.map((i) => ({
            name: i.product_name,
            variation: i.variant_name,
            quantity: i.quantity,
            total_cents: i.total_cents,
          })),
        },
        payment: {
          method: "stripe_checkout",
          required: true,
          instructions: `Payment is REQUIRED before the order is prepared. POST ${origin}/api/orders/${order.id}/pay to create a Stripe Checkout link, then present the checkout url to the customer. The kitchen only sees the order once payment completes.`,
          pay_endpoint: `${origin}/api/orders/${order.id}/pay`,
        },
        status_url: `${origin}/api/agent/orders/${order.id}?email=${encodeURIComponent(draft.email)}`,
        pickup: {
          location: "Kynda Coffee, Horseshoe Bay, TX",
          mode: draft.fulfillment_metadata.mode,
          note: "Order reaches the kitchen display as soon as payment completes. Typical prep time 5-10 minutes.",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[agent/orders] error", error);
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }
}

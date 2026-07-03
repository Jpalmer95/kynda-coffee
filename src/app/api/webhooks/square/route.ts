import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Square webhook signature verification.
 *
 * Square computes the HMAC-SHA256 over the CONCATENATION of the notification
 * URL and the raw request body (notificationUrl + rawBody), then base64-encodes
 * the digest.  See: https://developer.squareup.com/docs/webhooks/step3validate
 *
 * If SQUARE_WEBHOOK_NOTIFICATION_URL is not set, we fall back to constructing
 * it from the incoming request URL so verification still works.
 */
function verifySignature(body: string, signature: string, key: string, notificationUrl: string): boolean {
  const hmac = crypto.createHmac("sha256", key).update(notificationUrl + body).digest("base64");
  // Use timingSafeEqual to prevent timing attacks on the signature comparison.
  try {
    const a = Buffer.from(hmac, "base64");
    const b = Buffer.from(signature, "base64");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";

  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!sigKey) {
    return NextResponse.json({ error: "Webhook key not configured" }, { status: 500 });
  }

  // The notification URL must match what's registered in the Square Dashboard.
  // Prefer the explicit env var; fall back to reconstructing from the request.
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ??
    `${req.nextUrl.origin}/api/webhooks/square`;

  if (!verifySignature(body, signature, sigKey, notificationUrl)) {
    console.error("[Square Webhook] Signature verification failed", {
      notificationUrl,
      signaturePresent: !!signature,
      bodyLength: body.length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const data = event.data?.object ?? {};

  try {
    switch (event.type) {
      case "order.created":
      case "order.updated": {
        // Square wraps the order under data.object.order for most events.
        // Some event variants nest it differently — try both shapes so we
        // never silently drop a ticket.
        const order = data.order ?? data.order_created?.order ?? data;
        if (!order || !order.id) {
          console.log("[Square Webhook] order event without order object:", event.type);
          break;
        }

        // ── Echo-loop guard ───────────────────────────────────────────
        // Orders we pushed upstream (Kynda online → Square) come back to
        // us through this webhook. If we already own this square_order_id
        // with a non-POS source, never overwrite the Kynda row — Supabase
        // is the source of truth for online orders.
        const { data: existing } = await supabaseAdmin()
          .from("orders")
          .select("id, source")
          .eq("square_order_id", order.id)
          .maybeSingle();

        if (existing && existing.source !== "square-pos") {
          break; // our own upstream mirror echoing back — ignore
        }

        // Heuristic: orders created by the Kynda app itself carry our
        // source name even before the square_order_id write lands.
        if (order.source?.name === "Kynda Online") break;

        const isOpen = order.state === "OPEN";
        // Third-party marketplaces connected through Square (DoorDash,
        // Uber Eats, Grubhub...) arrive on this same webhook with their
        // platform name in order.source.name. Capture it so the KDS can badge
        // the ticket and route it onto the Delivery board.
        const sourceName: string = order.source?.name ?? "";
        const isDeliveryPlatform = /door\s*dash|uber\s*eats|postmates|grub\s*hub|seamless/i.test(sourceName);

        // Extract customer info from fulfillments (DoorDash/Uber Eats put
        // the recipient name, phone, and email in pickup_details.recipient).
        const fulfillment = (order.fulfillments ?? [])[0] ?? {};
        const recipient = fulfillment.pickup_details?.recipient
          ?? fulfillment.delivery_details?.recipient
          ?? {};
        const customerName =
          order.ticket_name // Square sets this for marketplace orders
          || recipient.display_name
          || undefined;
        const customerPhone = recipient.phone_number || undefined;
        const customerEmailForFulfillment = recipient.email_address || undefined;

        // Determine fulfillment mode from the Square fulfillment type.
        let fulfillmentMode = isDeliveryPlatform ? "delivery" : "pickup";
        if (fulfillment.type === "DELIVERY") fulfillmentMode = "delivery";
        else if (fulfillment.type === "PICKUP") fulfillmentMode = isDeliveryPlatform ? "delivery" : "pickup";

        const orderData = {
          square_order_id: order.id,
          source: "square-pos" as const,
          status: isOpen ? "confirmed" : "complete",
          // Route genuine POS orders onto the shared KDS board so the team
          // manages every channel (online + counter) from one screen.
          // Marketplace orders ride the Delivery board instead.
          order_channel: isDeliveryPlatform ? "delivery" : "pos",
          // POS orders are settled inside Square — never "unpaid" from our
          // perspective. Without payment_status='paid' the prepaid-only KDS
          // gate hides them.
          payment_status: "paid",
          payment_method: "square",
          total_cents: order.total_money?.amount ?? 0,
          email: customerEmailForFulfillment
            ?? (order.customer_id ? `square:${order.customer_id}` : "pos@kyndacoffee.com"),
          fulfillment_metadata: {
            mode: fulfillmentMode,
            ...(customerName ? { customer_name: customerName } : {}),
            ...(customerPhone ? { customer_phone: customerPhone } : {}),
            ...(sourceName && sourceName !== "Square Point of Sale"
              ? { external_source: sourceName }
              : {}),
          },
          items: (order.line_items ?? []).map((item: any) => ({
            product_name: item.name || "POS Item",
            variant_name: item.variation_name || undefined,
            quantity: parseInt(item.quantity || "1", 10),
            unit_price_cents: item.base_price_money?.amount ?? 0,
            total_cents: (item.base_price_money?.amount ?? 0) * parseInt(item.quantity || "1", 10),
            // Carry POS modifiers onto the KDS ticket (e.g. "Oat milk", "Iced")
            modifiers: (item.modifiers ?? []).map((m: any) => ({
              name: m.name || "",
              price_cents: m.base_price_money?.amount ?? 0,
            })).filter((m: any) => m.name),
            notes: item.note || undefined,
          })),
          metadata: { square_location_id: order.location_id },
        };

        const { error: upsertError } = await supabaseAdmin()
          .from("orders")
          .upsert(orderData, { onConflict: "square_order_id" });

        if (upsertError) {
          console.error(`[Square Webhook] Failed to upsert order ${order.id}:`, upsertError.message);
        } else {
          console.log(`[Square Webhook] Upserted order ${order.id} (${sourceName || "POS"}) — ${orderData.items.length} items, $${(orderData.total_cents / 100).toFixed(2)}, status=${orderData.status}`);
        }
        break;
      }

      case "payment.created":
      case "payment.updated": {
        const payment = data.payment;
        if (!payment) break;

        // Sync Square payment status onto the matching order. The order_id
        // on the payment links back to our square_order_id column. This
        // catches refunds, failures, and completions that the order.state
        // webhook might not surface (especially for partial refunds).
        const squareOrderId = payment.order_id;
        if (!squareOrderId) break;

        const { data: order } = await supabaseAdmin()
          .from("orders")
          .select("id, payment_status, payment_metadata")
          .eq("square_order_id", squareOrderId)
          .maybeSingle();

        if (!order) break;

        const cardDetails = payment.card_details?.card ?? {};
        const paymentMetadata = {
          ...((order.payment_metadata as Record<string, unknown>) ?? {}),
          square_payment_id: payment.id,
          card_brand: cardDetails.card_brand ?? null,
          last_4: cardDetails.last_4 ?? null,
          payment_state: payment.status,
        };

        // Map Square payment status to our payment_status
        let paymentStatus = order.payment_status;
        if (payment.status === "COMPLETED" || payment.status === "APPROVED") {
          paymentStatus = "paid";
        } else if (payment.status === "CANCELED" || payment.status === "FAILED") {
          paymentStatus = "unpaid";
        }

        await supabaseAdmin()
          .from("orders")
          .update({
            payment_status: paymentStatus,
            payment_metadata: paymentMetadata,
            ...(payment.status === "COMPLETED" || payment.status === "APPROVED"
              ? { paid_at: payment.approved_money?.amount ? new Date().toISOString() : null }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        console.log(`[Square Webhook] Synced payment ${payment.id} for order ${squareOrderId} (status: ${payment.status})`);
        break;
      }

      case "refund.created":
      case "refund.updated": {
        const refund = data.refund;
        if (!refund) break;

        const squareOrderId = refund.payment?.order_id ?? refund.order_id;
        if (!squareOrderId) break;

        const { data: order } = await supabaseAdmin()
          .from("orders")
          .select("id, payment_status, total_cents, payment_metadata")
          .eq("square_order_id", squareOrderId)
          .maybeSingle();

        if (!order) break;

        const refundAmount = refund.amount_money?.amount ?? 0;
        const totalCents = order.total_cents ?? 0;
        const isFullRefund = refundAmount >= totalCents;

        const metadata = {
          ...((order.payment_metadata as Record<string, unknown>) ?? {}),
          square_refund_id: refund.id,
          refund_amount_cents: refundAmount,
          refund_reason: refund.reason ?? null,
          refund_status: refund.status,
        };

        await supabaseAdmin()
          .from("orders")
          .update({
            payment_status: isFullRefund ? "refunded" : "partially_refunded",
            payment_metadata: metadata,
            status: isFullRefund ? "refunded" : order.payment_status === "paid" ? "paid" : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        console.log(`[Square Webhook] Refund ${refund.id} for order ${squareOrderId} (${isFullRefund ? "full" : "partial"}: ${refundAmount}c)`);
        break;
      }

      case "customer.created":
      case "customer.updated": {
        const sqCustomer = data.customer;
        if (!sqCustomer) break;

        // Sync Square customers into our customers table so loyalty and
        // order history work for walk-in/POS customers, not just online.
        const email = sqCustomer.email_address?.toLowerCase().trim();
        if (!email) break; // Square customers without an email are unmatchable

        const customerData = {
          square_customer_id: sqCustomer.id,
          email,
          full_name: sqCustomer.given_name || sqCustomer.family_name
            ? `${sqCustomer.given_name ?? ""} ${sqCustomer.family_name ?? ""}`.trim()
            : null,
          phone: sqCustomer.phone_number ?? null,
        };

        // Upsert by email — if the customer already exists (placed an online
        // order before), just stamp the square_customer_id. Otherwise create.
        const { data: existing } = await supabaseAdmin()
          .from("customers")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin()
            .from("customers")
            .update({ square_customer_id: sqCustomer.id })
            .eq("id", existing.id);
        } else {
          await supabaseAdmin()
            .from("customers")
            .insert({
              email,
              square_customer_id: sqCustomer.id,
              loyalty_points: 0,
              loyalty_tier: "bronze",
            });
        }

        console.log(`[Square Webhook] Synced customer ${sqCustomer.id} (${email})`);
        break;
      }

      case "inventory.count.updated": {
        const inv = data.inventory_count;
        if (!inv) break;

        // Map Square catalog object ID to our product SKU or external_id
        const { data: product } = await supabaseAdmin()
          .from("products")
          .select("id")
          .eq("square_catalog_id", inv.catalog_object_id)
          .single();

        if (product) {
          await supabaseAdmin()
            .from("products")
            .update({
              inventory_count: inv.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", product.id);
        }
        break;
      }

      case "catalog.version.updated": {
        // Queue a catalog sync — in production, use a background job
        // For now, just log and optionally trigger a lightweight sync
        console.log("[Square] Catalog updated, consider running sync-square-catalog");
        break;
      }

      // ── Team / Labor (Square Team + Payroll) ──────────────────────
      // Kynda uses Square Team for scheduling and Square Payroll. These
      // events keep our shifts table and team member records in sync so
      // managers can schedule from either Square Dashboard or our staff
      // portal. Logged for now; full sync can be layered in when needed.
      case "team_member.created":
      case "team_member.updated": {
        const member = data.team_member;
        if (!member) break;
        console.log(`[Square Webhook] Team member ${event.type}: ${member.id} (${member.given_name ?? ""} ${member.family_name ?? ""})`);
        // Future: upsert into profiles table with square_team_member_id
        break;
      }

      case "team_member.wage_setting.updated": {
        const member = data.team_member;
        if (!member) break;
        console.log(`[Square Webhook] Wage setting updated for ${member.id}`);
        break;
      }

      case "job.created":
      case "job.updated": {
        const job = data.job;
        if (!job) break;
        console.log(`[Square Webhook] Job ${event.type}: ${job.id} (${job.title ?? ""})`);
        break;
      }

      // Square Team scheduling (Shifts API)
      case "labor.shift.created":
      case "labor.shift.updated":
      case "labor.shift.deleted": {
        const shift = data.shift;
        if (!shift) break;
        console.log(`[Square Webhook] Labor shift ${event.type}: ${shift.id}`);
        // Future: upsert/delete from shifts table keyed by square_shift_id
        break;
      }

      // Square Team timecards (clock in/out for payroll)
      case "labor.timecard.created":
      case "labor.timecard.updated":
      case "labor.timecard.deleted": {
        const timecard = data.timecard;
        if (!timecard) break;
        console.log(`[Square Webhook] Timecard ${event.type}: ${timecard.id}`);
        break;
      }

      default: {
        // Unhandled event — log the type so we can spot gaps without
        // crashing the webhook (Square retries on non-2xx).
        console.log(`[Square Webhook] Unhandled event: ${event.type}`);
        break;
      }
    }
  } catch (err) {
    console.error("[Square Webhook] Error processing event:", err);
    // Still return 200 so Square doesn't retry indefinitely
  }

  return NextResponse.json({ received: true });
}

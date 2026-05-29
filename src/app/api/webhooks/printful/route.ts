import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/printful
 *
 * Receives Printful webhook notifications:
 * - package_shipped: update order status, optionally send shipping email
 * - order_failed: alert admin, flag order for manual review
 *
 * Webhook setup: Add this URL in Printful Dashboard → Settings → Webhooks
 * or via API: POST /webhooks with events: ["package_shipped", "order_failed"]
 *
 * Printful sends: POST with { type, data } JSON payload.
 * No signature verification (Printful doesn't support HMAC signing).
 * Instead, validate the order exists in our DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    console.log(`[Printful Webhook] ${type}`, JSON.stringify(data?.order_id || ""));

    const db = supabaseAdmin();

    switch (type) {
      case "package_shipped": {
        const orderId = data?.order_id; // Printful's internal order ID
        const externalId = data?.external_id; // Our order ID if set
        const trackingNumber = data?.shipment?.tracking_number || null;
        const trackingUrl = data?.shipment?.tracking_url || null;
        const carrier = data?.shipment?.carrier_name || data?.shipment?.service_name || null;
        const reshipment = data?.reshipment || false;

        // Find our order by external_id or metadata.printful_order_id
        let orderQuery = db.from("orders").select("*");

        if (externalId) {
          orderQuery = orderQuery.eq("id", externalId);
        } else {
          // Fallback: search metadata JSONB for printful_order_id match
          orderQuery = orderQuery.filter(
            "metadata->>'printful_order_id'",
            "eq",
            String(orderId)
          );
        }

        const { data: order } = await orderQuery.maybeSingle();

        if (order) {
          await db
            .from("orders")
            .update({
              fulfillment_status: reshipment ? "reshipped" : "shipped",
              metadata: {
                ...((order.metadata as Record<string, unknown>) || {}),
                printful_order_id: orderId,
                tracking_number: trackingNumber,
                tracking_url: trackingUrl,
                carrier,
                shipped_at: new Date().toISOString(),
                reshipment,
              },
            })
            .eq("id", order.id);

          // Send shipping notification email (non-fatal if it fails)
          try {
            if (order.email) {
              const { sendEmail } = await import("@/lib/email/service");
              await sendEmail({
                to: order.email,
                subject: `Your Kynda merch order has shipped! 📦`,
                template: "shipping-notification",
                data: {
                  customer_name: order.customer_name || "there",
                  order_id: order.id,
                  tracking_number: trackingNumber,
                  tracking_url: trackingUrl,
                  carrier,
                },
              });
            }
          } catch (emailErr: any) {
            console.warn("[Printful Webhook] Shipping email failed:", emailErr.message);
          }
        } else {
          console.warn(`[Printful Webhook] package_shipped — no matching order for printful_id=${orderId}`);
        }

        break;
      }

      case "order_failed": {
        const orderId = data?.order_id;
        const externalId = data?.external_id;
        const failures = data?.reason || "Unknown reason";

        // Find the order
        let orderQuery = db.from("orders").select("*");

        if (externalId) {
          orderQuery = orderQuery.eq("id", externalId);
        } else {
          orderQuery = orderQuery.filter(
            "metadata->>'printful_order_id'",
            "eq",
            String(orderId)
          );
        }

        const { data: order } = await orderQuery.maybeSingle();

        if (order) {
          await db
            .from("orders")
            .update({
              fulfillment_status: "failed",
              metadata: {
                ...((order.metadata as Record<string, unknown>) || {}),
                printful_order_id: orderId,
                printful_failure_reason: failures,
                failed_at: new Date().toISOString(),
              },
            })
            .eq("id", order.id);
        }

        // Notify admin (via notifications table if available)
        try {
          await db.from("notifications").insert({
            type: "warning",
            title: "Printful Order Failed",
            message: `Order ${externalId || orderId} failed: ${failures}`,
            metadata: { printful_order_id: orderId, failures },
            read: false,
          });
        } catch {
          console.warn("[Printful Webhook] Could not create admin notification");
        }

        break;
      }

      case "package_returned": {
        // A package was returned — flag the order
        const orderId = data?.order_id;
        const externalId = data?.external_id;

        if (externalId) {
          const { data: order } = await db
            .from("orders")
            .select("metadata")
            .eq("id", externalId)
            .single();

          if (order) {
            await db
              .from("orders")
              .update({
                metadata: {
                  ...((order.metadata as Record<string, unknown>) || {}),
                  returned_at: new Date().toISOString(),
                  return_reason: data?.reason || "returned",
                },
              })
              .eq("id", externalId);
          }
        }

        break;
      }

      default:
        // Unhandled event types — log and acknowledge
        console.log(`[Printful Webhook] Unhandled event: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Printful Webhook] Error:", err.message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

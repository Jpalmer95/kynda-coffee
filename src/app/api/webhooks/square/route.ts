import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function verifySignature(body: string, signature: string, key: string): boolean {
  const hmac = crypto.createHmac("sha256", key).update(body).digest("base64");
  return hmac === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";

  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!sigKey) {
    return NextResponse.json({ error: "Webhook key not configured" }, { status: 500 });
  }

  if (!verifySignature(body, signature, sigKey)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const data = event.data?.object ?? {};

  try {
    switch (event.type) {
      case "order.created":
      case "order.updated": {
        const order = data.order;
        if (!order) break;

        const orderData = {
          square_order_id: order.id,
          source: "square-pos" as const,
          status: order.state === "OPEN" ? "confirmed" : "delivered",
          total_cents: order.total_money?.amount ?? 0,
          email: order.customer_id ? `square:${order.customer_id}` : "pos@kynda.local",
          items: (order.line_items ?? []).map((item: any) => ({
            product_name: item.name || "POS Item",
            quantity: parseInt(item.quantity || "1", 10),
            unit_price_cents: item.base_price_money?.amount ?? 0,
            total_cents: (item.base_price_money?.amount ?? 0) * parseInt(item.quantity || "1", 10),
          })),
          metadata: { square_location_id: order.location_id },
        };

        await supabaseAdmin()
          .from("orders")
          .upsert(orderData, { onConflict: "square_order_id" });
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
    }
  } catch (err) {
    console.error("[Square Webhook] Error processing event:", err);
    // Still return 200 so Square doesn't retry indefinitely
  }

  return NextResponse.json({ received: true });
}

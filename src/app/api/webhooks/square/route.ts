import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Square webhook handler — syncs POS orders, inventory changes
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";

  // Verify webhook signature
  const hmac = crypto
    .createHmac("sha256", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!)
    .update(body)
    .digest("base64");

  if (hmac !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case "order.created":
    case "order.updated": {
      // Sync Square POS orders to Supabase for unified reporting
      console.log("Square order event:", event.data?.object?.order?.id);
      // TODO: Map Square order to Supabase orders table
      break;
    }

    case "inventory.count.updated": {
      // Sync inventory changes from Square to Supabase
      console.log("Square inventory update:", event.data?.object?.inventory_count);
      // TODO: Update Supabase inventory
      break;
    }

    case "catalog.version.updated": {
      // Square catalog changed (new products, price changes)
      console.log("Square catalog updated");
      // TODO: Sync catalog to Supabase products
      break;
    }
  }

  return NextResponse.json({ received: true });
}

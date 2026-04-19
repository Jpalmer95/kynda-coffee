import { NextRequest, NextResponse } from "next/server";
import { fullSync, syncCatalog, syncInventory, syncRecentOrders } from "@/lib/square/sync";

export const dynamic = "force-dynamic";

// POST /api/square/sync — Trigger Square POS sync
// Body: { type: "all" | "catalog" | "inventory" | "orders" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type ?? "all";

    let result;

    switch (type) {
      case "catalog":
        result = { catalog: await syncCatalog() };
        break;
      case "inventory":
        result = { inventory: await syncInventory() };
        break;
      case "orders":
        result = { orders: await syncRecentOrders(body.hoursBack ?? 24) };
        break;
      case "all":
      default:
        result = await fullSync();
        break;
    }

    return NextResponse.json({ sync: result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Square sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// GET /api/square/sync — Get sync status
export async function GET() {
  return NextResponse.json({
    square_connected: !!process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT ?? "not set",
    location_id: process.env.SQUARE_LOCATION_ID ?? "not set",
  });
}

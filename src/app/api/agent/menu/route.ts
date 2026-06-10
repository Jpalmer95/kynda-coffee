import { NextRequest, NextResponse } from "next/server";
import { getPosCatalog } from "@/lib/pos/catalog";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/menu — public, agent-friendly café menu.
 *
 * Part of the agent-native ordering surface (see /.well-known/agent.json).
 * Returns every QR-orderable menu item with the exact IDs an agent needs to
 * place an order via POST /api/agent/orders: providerItemId,
 * providerVariationId, and modifier IDs (with min/max selection rules).
 *
 * No auth — this is the same public data the QR menu page renders.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(ip, { identifier: "agent-menu", windowMs: 60_000, maxRequests: 30 });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true, limit: 500 });

    const items = catalog.items
      .filter((item) => item.availableQr)
      .map((item) => ({
        providerItemId: item.providerItemId,
        name: item.name,
        description: item.description || undefined,
        category: item.categoryName || undefined,
        variations: item.variations.map((v) => ({
          providerVariationId: v.providerVariationId,
          name: v.name,
          price_cents: v.priceCents,
        })),
        modifierLists: item.modifierLists.map((list) => ({
          name: list.name,
          minSelected: list.minSelectedModifiers,
          maxSelected: list.maxSelectedModifiers,
          modifiers: list.modifiers.map((m) => ({
            modifierId: m.providerModifierId,
            name: m.name,
            price_cents: m.priceCents,
          })),
        })),
      }));

    return NextResponse.json({
      store: {
        name: "Kynda Coffee",
        location: "Horseshoe Bay, TX",
        timezone: "America/Chicago",
        hours: "7am-5pm daily (Central)",
      },
      currency: "USD",
      ordering: {
        place_order: "POST /api/agent/orders",
        order_status: "GET /api/agent/orders/{id}?email={customer_email}",
        docs: "/.well-known/agent.json",
      },
      item_count: items.length,
      items,
    });
  } catch (error) {
    console.error("[agent/menu] error", error);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

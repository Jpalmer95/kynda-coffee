import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/cron/sync
 *
 * Cron-friendly endpoint to trigger catalog and/or mockup syncs.
 * Authenticates via X-Agent-Key header matching AGENT_API_KEY env var
 * (same key used by the Hermes agent API bridge).
 *
 * Body options (all optional, defaults to catalog only):
 *   { "catalog": true, "mockups": false, "orders": false }
 *
 * Returns a summary of what was synced.
 */
export async function POST(req: NextRequest) {
  // --- Auth gate ---
  const agentKey = req.headers.get("x-agent-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.AGENT_API_KEY;

  if (!expected) {
    return NextResponse.json(
      { error: "AGENT_API_KEY not configured on server" },
      { status: 500 }
    );
  }
  if (!agentKey || agentKey !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { catalog?: boolean; mockups?: boolean; orders?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body — default to catalog
  }

  const runCatalog = body.catalog !== false;
  const runMockups = body.mockups === true;
  const runOrders = body.orders === true;
  const results: Record<string, unknown> = {};
  const baseUrl = new URL(req.url).origin;

  if (runCatalog) {
    try {
      const res = await fetch(`${baseUrl}/api/square/sync-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      results.catalog = await res.json();
    } catch (err) {
      results.catalog = { error: String(err) };
    }
  }

  if (runMockups) {
    try {
      const res = await fetch(`${baseUrl}/api/admin/mockups/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      results.mockups = await res.json();
    } catch (err) {
      results.mockups = { error: String(err) };
    }
  }

  if (runOrders) {
    try {
      const res = await fetch(`${baseUrl}/api/square/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "orders", hoursBack: 24 }),
      });
      results.orders = await res.json();
    } catch (err) {
      results.orders = { error: String(err) };
    }
  }

  return NextResponse.json({ success: true, triggered: { catalog: runCatalog, mockups: runMockups, orders: runOrders }, results });
}

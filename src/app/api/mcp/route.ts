import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveCafeOrderingEnabled } from "@/lib/ordering/availability";

export const dynamic = "force-dynamic";

/**
 * Public Customer Model Context Protocol (MCP) Endpoint — /api/mcp
 *
 * Allows any customer's personal AI agent (Claude, ChatGPT, Hermes, Cursor, etc.)
 * to interact with Kynda Coffee via standard JSON-RPC 2.0 MCP methods:
 *  - initialize
 *  - tools/list
 *  - tools/call
 *
 * Strictly BYOC & Read/Order-scoped:
 *  - Never exposes PII or internal team metrics.
 *  - Café orders respect `isCafeOrderingEnabled()` and link to Stripe prepayment.
 */

const MCP_TOOLS = [
  {
    name: "kynda_store_status",
    description:
      "Get Kynda Coffee's hours, location (Horseshoe Bay, TX), relocation status (4909 RM 2147 Grand Opening Winter 2026), and whether live café drink ordering or bean/merch shipping is currently active.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "kynda_browse_menu",
    description:
      "Browse Kynda Coffee's menu items and fresh-roasted shipped coffee beans with prices in cents.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional filter (e.g. 'espresso', 'cold-brew', 'coffee-beans', 'merch')",
        },
        query: {
          type: "string",
          description: "Optional search keyword (e.g. 'oat', 'lavender', 'ethiopia')",
        },
      },
    },
  },
  {
    name: "kynda_ask_concierge",
    description:
      "Ask a customer question about Kynda Coffee's menu, dietary/allergen options (oat/almond/coconut milk, gluten-free), shipping, or location.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The customer's question" },
      },
      required: ["question"],
    },
  },
];

export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  return NextResponse.json({
    protocol: "mcp",
    protocolVersion: "2024-11-05",
    serverInfo: {
      name: "kynda-coffee-customer-mcp",
      version: "1.0.0",
      description:
        "Kynda Coffee Public Customer MCP Server — browse specialty coffee, check store status, and initiate orders.",
    },
    endpoints: {
      mcp_jsonrpc: `${origin}/api/mcp`,
      agent_manifest: `${origin}/.well-known/agent.json`,
      menu_rest: `${origin}/api/agent/menu`,
      orders_rest: `${origin}/api/agent/orders`,
    },
    tools: MCP_TOOLS,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(ip, {
    identifier: "public-mcp",
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  let rpc: { jsonrpc?: string; id?: string | number | null; method?: string; params?: any };
  try {
    rpc = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const id = rpc.id ?? 1;
  const method = rpc.method ?? "";

  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "kynda-coffee-customer-mcp",
          version: "1.0.0",
        },
      },
    });
  }

  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: { tools: MCP_TOOLS },
    });
  }

  if (method === "tools/call") {
    const toolName = rpc.params?.name;
    const args = rpc.params?.arguments ?? {};
    const cafeOpen = resolveCafeOrderingEnabled();

    if (toolName === "kynda_store_status") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  name: "Kynda Coffee",
                  pronunciation: "KEN-DUH (Old Norse: 'to kindle a flame')",
                  new_address: "4909 RM 2147, Horseshoe Bay, TX 78657",
                  hours: "7:00 AM – 5:00 PM Central Daily",
                  cafe_ordering_enabled: cafeOpen,
                  shipped_beans_and_merch_enabled: true,
                  relocation_note: cafeOpen
                    ? "Café ordering is live!"
                    : "In-person café ordering is temporarily paused while we finish our new specialty coffee house at 4909 RM 2147 (Grand Opening Winter 2026). Fresh-roasted coffee beans and merch ship nationwide today via /shop!",
                },
                null,
                2
              ),
            },
          ],
        },
      });
    }

    if (toolName === "kynda_browse_menu") {
      const db = supabaseAdmin();
      const query = typeof args.query === "string" ? args.query.toLowerCase().trim() : "";
      const { data: items } = await db
        .from("pos_items")
        .select("name, category, price_cents, description, item_type")
        .eq("is_active", true)
        .limit(40);

      const filtered = ((items as any[]) ?? []).filter((it) => {
        if (!query) return true;
        return (
          (it.name ?? "").toLowerCase().includes(query) ||
          (it.category ?? "").toLowerCase().includes(query) ||
          (it.description ?? "").toLowerCase().includes(query)
        );
      });

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: filtered.length,
                  cafe_ordering_enabled: cafeOpen,
                  items: filtered.slice(0, 20).map((it) => ({
                    name: it.name,
                    category: it.category,
                    price_dollars: `$${((it.price_cents ?? 0) / 100).toFixed(2)}`,
                    description: it.description,
                  })),
                  order_endpoints: {
                    cafe_order: "/api/agent/orders",
                    shipped_checkout: "/api/checkout",
                  },
                },
                null,
                2
              ),
            },
          ],
        },
      });
    }

    if (toolName === "kynda_ask_concierge") {
      const q = String(args.question ?? "").toLowerCase();
      let answer =
        "Kynda Coffee is a specialty coffee house in Horseshoe Bay, TX (moving to our first owned location at 4909 RM 2147 for our Winter 2026 Grand Opening). We serve organic specialty espresso, cold brew on tap, locally loved pastries, and ship fresh-roasted coffee beans and custom merch nationwide.";
      if (q.includes("milk") || q.includes("vegan") || q.includes("dairy")) {
        answer =
          "We offer Whole Milk, 2% Milk, Oat Milk (Barista Edition), Almond Milk, and Coconut Milk. Almost any espresso, matcha, or chai drink can be made 100% vegan and dairy-free!";
      } else if (q.includes("ship") || q.includes("bean") || q.includes("subscription")) {
        answer =
          "Yes! Our fresh-roasted coffee beans and Kynda merch ship anywhere in the US right now via https://kyndacoffee.com/shop (or via POST /api/checkout for AI agents).";
      } else if (q.includes("where") || q.includes("location") || q.includes("address") || q.includes("move")) {
        answer =
          "Our new owned specialty coffee house is at 4909 RM 2147, Horseshoe Bay, TX 78657 (Grand Opening Winter 2026). See renders and updates at https://kyndacoffee.com/moving.";
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: answer }],
        },
      });
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    },
    { status: 400 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toCsv, csvDownloadHeaders, type CsvRow } from "@/lib/export/csv";

export const dynamic = "force-dynamic";

/**
 * Unified data-export endpoint (Roadmap V2 — Epic 10, data ownership).
 *
 * "I own my own business data." This gives the owner clean, portable exports of
 * every table that matters — as real downloadable CSV (opens in Excel/Sheets) or
 * as a single JSON bundle for full portability / migration off this stack.
 *
 *   GET /api/admin/export?entity=orders&format=csv      → orders.csv download
 *   GET /api/admin/export?entity=all&format=json        → complete JSON bundle
 *   GET /api/admin/export                                → lists available entities
 *
 * Admin-only. Uses the service-role client (bypasses RLS) behind requireTier.
 */

// Each exportable entity → its table + the columns to select (null = all).
const ENTITIES: Record<string, { table: string; columns?: string }> = {
  orders: { table: "orders" },
  customers: { table: "customers" },
  profiles: { table: "profiles" },
  products: { table: "products" },
  specials: { table: "specials" },
  social_posts: { table: "social_posts" },
  newsletters: { table: "newsletters" },
  newsletter_subscribers: { table: "newsletter_subscribers" },
  contact_submissions: { table: "contact_submissions" },
  b2b_leads: { table: "b2b_leads" },
  b2b_accounts: { table: "b2b_accounts" },
  b2b_orders: { table: "b2b_orders" },
  loyalty_transactions: { table: "loyalty_transactions" },
  referral_codes: { table: "referral_codes" },
};

async function fetchEntity(name: string): Promise<CsvRow[]> {
  const def = ENTITIES[name];
  if (!def) return [];
  const { data, error } = await getSupabaseAdmin().from(def.table).select(def.columns ?? "*");
  if (error) {
    console.warn(`[export] ${name} failed:`, error.message);
    return [];
  }
  return (data ?? []) as unknown as CsvRow[];
}

export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const entity = params.get("entity");
  const format = (params.get("format") ?? "csv").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  // No entity → describe what's available.
  if (!entity) {
    return NextResponse.json({
      entities: Object.keys(ENTITIES),
      usage: "?entity=<name|all>&format=csv|json",
    });
  }

  // Full portability bundle.
  if (entity === "all") {
    const bundle: Record<string, CsvRow[]> = {};
    for (const name of Object.keys(ENTITIES)) {
      bundle[name] = await fetchEntity(name);
    }
    const payload = {
      exported_at: new Date().toISOString(),
      business: "Kynda Coffee",
      source: "kyndacoffee.com self-hosted (Supabase)",
      entities: bundle,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="kynda-data-export-${stamp}.json"`,
      },
    });
  }

  if (!ENTITIES[entity]) {
    return NextResponse.json(
      { error: `Unknown entity '${entity}'`, available: Object.keys(ENTITIES) },
      { status: 400 }
    );
  }

  const rows = await fetchEntity(entity);

  if (format === "json") {
    return new NextResponse(JSON.stringify({ entity, count: rows.length, rows }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${entity}-${stamp}.json"`,
      },
    });
  }

  // Default: downloadable CSV.
  const csv = toCsv(rows);
  return new NextResponse(csv, { headers: csvDownloadHeaders(`${entity}-${stamp}.csv`) });
}

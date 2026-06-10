import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildPnl, type AccountingCategory, type PnlTxn } from "@/lib/accounting/core";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/accounting/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD — P&L statement
 * from confirmed + suggested transactions (transfers excluded; uncategorized
 * surfaced). Owner only. Defaults to the current month.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const now = new Date();
  const defaultFrom = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("from") ?? "") ? sp.get("from")! : defaultFrom;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("to") ?? "") ? sp.get("to")! : now.toISOString().slice(0, 10);

  const [{ data: txns, error: txnErr }, { data: cats, error: catErr }] = await Promise.all([
    supabaseAdmin()
      .from("bank_transactions")
      .select("amount_cents, category_id, category_state")
      .gte("posted_at", from)
      .lte("posted_at", to)
      .limit(10000),
    supabaseAdmin()
      .from("accounting_categories")
      .select("id, label, kind, sort_order"),
  ]);

  if (txnErr || catErr) {
    return NextResponse.json({ error: "Failed to load accounting data." }, { status: 500 });
  }

  const pnl = buildPnl(
    (txns ?? []) as PnlTxn[],
    (cats ?? []) as AccountingCategory[],
    { from, to }
  );

  return NextResponse.json({ pnl });
}

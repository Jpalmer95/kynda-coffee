import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseBankCsv, categorizeDeterministic, type CategorizationRule } from "@/lib/accounting/core";

export const dynamic = "force-dynamic";

/**
 * Smart Accounting — accounts + CSV bank-feed import (owner only).
 *
 * GET    — list accounts with balances + txn counts
 * POST   — { action: "create_account", name, institution?, kind?, last4? }
 *        — { action: "import_csv", account_id, csv } → parse, dedupe,
 *          auto-categorize (rules + heuristics → state 'suggested'), insert.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const { data: accounts, error } = await supabaseAdmin()
    .from("bank_accounts")
    .select("id, name, institution, kind, last4, source, is_active, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load accounts." }, { status: 500 });

  // Per-account rollup (count + balance) in one query
  const { data: sums } = await supabaseAdmin().rpc("bank_account_summaries").select();

  let summaries: Record<string, { txn_count: number; balance_cents: number }> = {};
  if (sums) {
    for (const s of sums as { account_id: string; txn_count: number; balance_cents: number }[]) {
      summaries[s.account_id] = { txn_count: Number(s.txn_count), balance_cents: Number(s.balance_cents) };
    }
  } else {
    // RPC missing (function not created) — fall back to a single aggregate query
    const { data: txns } = await supabaseAdmin()
      .from("bank_transactions")
      .select("account_id, amount_cents");
    for (const t of txns ?? []) {
      const cur = summaries[t.account_id] ?? { txn_count: 0, balance_cents: 0 };
      cur.txn_count++;
      cur.balance_cents += t.amount_cents;
      summaries[t.account_id] = cur;
    }
  }

  return NextResponse.json({
    accounts: (accounts ?? []).map((a) => ({
      ...a,
      txn_count: summaries[a.id]?.txn_count ?? 0,
      balance_cents: summaries[a.id]?.balance_cents ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  try {
    const body = await req.json();

    if (body.action === "create_account") {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Account name required." }, { status: 400 });
      const kind = ["checking", "savings", "credit_card", "payment_processor", "cash", "other"].includes(body.kind)
        ? body.kind
        : "checking";
      const { data, error } = await supabaseAdmin()
        .from("bank_accounts")
        .insert({
          name: name.slice(0, 80),
          institution: (body.institution ? String(body.institution) : "").slice(0, 80) || null,
          kind,
          last4: (body.last4 ? String(body.last4) : "").slice(0, 4) || null,
          source: "csv",
        })
        .select("id, name")
        .single();
      if (error) return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
      return NextResponse.json({ account: data });
    }

    if (body.action === "import_csv") {
      const accountId = String(body.account_id ?? "");
      const csv = String(body.csv ?? "");
      if (!accountId || !csv) {
        return NextResponse.json({ error: "account_id and csv are required." }, { status: 400 });
      }
      if (csv.length > 2_000_000) {
        return NextResponse.json({ error: "CSV too large (2MB max)." }, { status: 400 });
      }

      const parsed = parseBankCsv(csv);
      if (parsed.txns.length === 0) {
        return NextResponse.json({ error: parsed.errors[0] ?? "No transactions found.", row_errors: parsed.errors }, { status: 400 });
      }

      // Load owner rules once
      const { data: ruleRows } = await supabaseAdmin()
        .from("categorization_rules")
        .select("matcher, category_id, priority");
      const rules = (ruleRows ?? []) as CategorizationRule[];

      // Dedupe within DB: source+external_id unique index handles id'd rows; for
      // rows without an external id, synthesize a stable hash key.
      const rows = parsed.txns.map((t) => {
        const det = categorizeDeterministic(
          { description: t.description, amount_cents: t.amount_cents },
          rules
        );
        const externalId =
          t.external_id ??
          `csvhash:${t.posted_at}:${t.amount_cents}:${t.description.slice(0, 60).replace(/\s+/g, "_")}`;
        return {
          account_id: accountId,
          posted_at: t.posted_at,
          amount_cents: t.amount_cents,
          description: t.description,
          source: "csv" as const,
          external_id: externalId,
          category_id: det.category_id,
          category_state: det.category_id ? ("suggested" as const) : ("uncategorized" as const),
          suggested_by: det.suggested_by,
        };
      });

      // Upsert with ignoreDuplicates → re-importing the same file is a no-op.
      const { data: inserted, error } = await supabaseAdmin()
        .from("bank_transactions")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error("CSV import error", error);
        return NextResponse.json({ error: "Import failed." }, { status: 500 });
      }

      const suggested = rows.filter((r) => r.category_state === "suggested").length;
      return NextResponse.json({
        imported: inserted?.length ?? 0,
        duplicates_skipped: rows.length - (inserted?.length ?? 0),
        auto_suggested: suggested,
        row_errors: parsed.errors,
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TXN_SELECT =
  "id, account_id, posted_at, amount_cents, description, merchant, source, category_id, category_state, suggested_by, notes";

/**
 * GET — transactions for review (filter: state, account, month). Owner only.
 * PATCH — { id, category_id } confirm/override a category (state → confirmed)
 *         { id, category_id, create_rule: true, matcher } also saves a rule so
 *         future imports auto-categorize the same counterparty.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const state = sp.get("state"); // uncategorized | suggested | confirmed
  const accountId = sp.get("account_id");
  const month = sp.get("month"); // YYYY-MM

  let query = supabaseAdmin()
    .from("bank_transactions")
    .select(TXN_SELECT)
    .order("posted_at", { ascending: false })
    .limit(500);

  if (state && ["uncategorized", "suggested", "confirmed"].includes(state)) {
    query = query.eq("category_state", state);
  }
  if (accountId) query = query.eq("account_id", accountId);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const from = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    query = query.gte("posted_at", from).lt("posted_at", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });

  const { data: cats } = await supabaseAdmin()
    .from("accounting_categories")
    .select("id, label, kind, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({ transactions: data ?? [], categories: cats ?? [] });
}

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    const categoryId = String(body.category_id ?? "");
    if (!id || !categoryId) {
      return NextResponse.json({ error: "id and category_id required." }, { status: 400 });
    }

    // Validate the category exists
    const { data: cat } = await supabaseAdmin()
      .from("accounting_categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (!cat) return NextResponse.json({ error: "Unknown category." }, { status: 400 });

    const { data: txn, error } = await supabaseAdmin()
      .from("bank_transactions")
      .update({
        category_id: categoryId,
        category_state: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(TXN_SELECT)
      .single();

    if (error || !txn) return NextResponse.json({ error: "Failed to update." }, { status: 500 });

    // Optional: learn a rule from this confirmation
    if (body.create_rule && typeof body.matcher === "string" && body.matcher.trim().length >= 3) {
      await supabaseAdmin().from("categorization_rules").insert({
        matcher: body.matcher.trim().toLowerCase().slice(0, 80),
        category_id: categoryId,
        priority: 50,
        created_by: team.user.id,
      });
    }

    return NextResponse.json({ transaction: txn });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

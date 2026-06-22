import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** GET — list all gift cards */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin()
    .from("gift_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ gift_cards: data ?? [] });
}

/** POST — create a new gift card (admin-issued) */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const amountCents = Math.round(Number(body.amount) * 100);

    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: "Amount must be at least $1.00" }, { status: 400 });
    }

    const recipientEmail = body.recipient_email ? String(body.recipient_email).trim() : null;
    const message = body.message ? String(body.message).trim() : null;

    // Generate a unique code
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `KYND-${year}-${random}`;

    const { data, error } = await supabaseAdmin()
      .from("gift_cards")
      .insert({
        code,
        amount_cents: amountCents,
        balance_cents: amountCents,
        recipient_email: recipientEmail,
        message,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("[admin/gift-cards] create error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ gift_card: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/** PATCH — update a gift card (status, balance) */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, status, balance_cents } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (status !== undefined) update.status = status;
    if (balance_cents !== undefined) update.balance_cents = balance_cents;

    const { data, error } = await supabaseAdmin()
      .from("gift_cards")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ gift_card: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

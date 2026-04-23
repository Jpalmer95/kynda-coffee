import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, amount_cents } = body;

    if (!code || !amount_cents) {
      return NextResponse.json({ error: "Code and amount required" }, { status: 400 });
    }

    const { data: giftCard } = await supabaseAdmin()
      .from("gift_cards")
      .select("id, balance_cents, status")
      .eq("code", code)
      .maybeSingle();

    if (!giftCard) {
      return NextResponse.json({ error: "Invalid gift card code" }, { status: 404 });
    }

    if (giftCard.status !== "active") {
      return NextResponse.json({ error: "Gift card is not active" }, { status: 400 });
    }

    if (giftCard.balance_cents < amount_cents) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const newBalance = giftCard.balance_cents - amount_cents;
    await supabaseAdmin()
      .from("gift_cards")
      .update({
        balance_cents: newBalance,
        status: newBalance <= 0 ? "redeemed" : "active",
      })
      .eq("id", giftCard.id);

    return NextResponse.json({ success: true, remaining_balance_cents: newBalance });
  } catch {
    return NextResponse.json({ error: "Failed to redeem gift card" }, { status: 500 });
  }
}

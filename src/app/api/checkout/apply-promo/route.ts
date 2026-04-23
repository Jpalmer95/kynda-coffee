import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "apply-promo", windowMs: 60_000, maxRequests: 20 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } });
    }

    const { code, subtotal_cents } = await req.json();
    if (!code || typeof subtotal_cents !== "number") {
      return NextResponse.json(
        { error: "Code and subtotal required" },
        { status: 400 }
      );
    }

    const normalized = code.trim().toUpperCase();

    // Check promo_codes table first
    const { data: promo } = await supabaseAdmin()
      .from("promo_codes")
      .select("*")
      .eq("code", normalized)
      .eq("is_active", true)
      .single();

    if (promo) {
      // Check expiry
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return NextResponse.json({ error: "Promo code expired" }, { status: 400 });
      }
      // Check usage limit
      if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
        return NextResponse.json({ error: "Promo code usage limit reached" }, { status: 400 });
      }
      // Check minimum order
      if (promo.min_order_cents && subtotal_cents < promo.min_order_cents) {
        return NextResponse.json(
          {
            error: `Minimum order of $${(promo.min_order_cents / 100).toFixed(2)} required`,
          },
          { status: 400 }
        );
      }

      let discount_cents = 0;
      if (promo.type === "percentage") {
        discount_cents = Math.round((subtotal_cents * promo.value) / 100);
      } else if (promo.type === "fixed_amount") {
        discount_cents = Math.min(promo.value, subtotal_cents);
      } else if (promo.type === "free_shipping") {
        discount_cents = 0; // handled separately
      }

      return NextResponse.json({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        discount_cents,
      });
    }

    // Check gift_cards table
    const { data: giftCard } = await supabaseAdmin()
      .from("gift_cards")
      .select("*")
      .eq("code", normalized)
      .eq("status", "active")
      .single();

    if (giftCard) {
      if (giftCard.balance_cents <= 0) {
        return NextResponse.json({ error: "Gift card has no remaining balance" }, { status: 400 });
      }

      const discount_cents = Math.min(giftCard.balance_cents, subtotal_cents);

      return NextResponse.json({
        code: giftCard.code,
        type: "fixed_amount" as const,
        value: giftCard.balance_cents,
        discount_cents,
        gift_card_id: giftCard.id,
      });
    }

    return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

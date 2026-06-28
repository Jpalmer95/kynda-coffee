import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Strict: redemption brute-forces card codes. 10/min/IP.
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "gift-card-redeem", windowMs: 60_000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await req.json();
    const { code, amount_cents } = body;

    if (!code || !amount_cents) {
      return NextResponse.json({ error: "Code and amount required" }, { status: 400 });
    }

    // ── Race-condition-safe redemption ────────────────────────────────
    // Uses a SECURITY DEFINER RPC that locks the gift card row with
    // SELECT ... FOR UPDATE, validates the balance, and decrements in a
    // single transaction. Concurrent redemption attempts serialize on
    // the row lock, preventing double-spend.
    const { data: result, error: rpcError } = await supabaseAdmin()
      .rpc("redeem_gift_card", {
        p_code: code,
        p_amount_cents: amount_cents,
      });

    if (rpcError) {
      console.error("Gift card redeem RPC error:", rpcError);
      return NextResponse.json({ error: "Failed to redeem gift card" }, { status: 500 });
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Invalid gift card code" }, { status: 404 });
    }

    const r = result[0];
    if (!r.success) {
      return NextResponse.json({ error: r.message || "Failed to redeem gift card" }, { status: 400 });
    }

    return NextResponse.json({ success: true, remaining_balance_cents: r.remaining_balance_cents });
  } catch {
    return NextResponse.json({ error: "Failed to redeem gift card" }, { status: 500 });
  }
}

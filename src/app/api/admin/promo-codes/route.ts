import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/promo-codes — list all promo codes
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ promo_codes: data ?? [] });
}

// POST /api/admin/promo-codes — create new promo code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      type,
      value,
      min_order_cents,
      max_uses,
      expires_at,
    } = body;

    if (!code || !type || value == null) {
      return NextResponse.json(
        { error: "Code, type, and value are required" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check for duplicate
    const { data: existing } = await supabaseAdmin()
      .from("promo_codes")
      .select("id")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Promo code already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin()
      .from("promo_codes")
      .insert({
        code: normalizedCode,
        type,
        value,
        min_order_cents: min_order_cents ?? null,
        max_uses: max_uses ?? null,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        uses_count: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ promo_code: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

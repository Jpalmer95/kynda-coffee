import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listEffectiveProfiles, invalidatePricingRulesCache } from "@/lib/pricing/rules";
import { calculatePrice, type RoundingStrategy } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

const ROUNDINGS = new Set(["none", "charm_99", "charm_49_99", "nearest_5", "nearest_25"]);

/**
 * GET — effective profiles (defaults merged with overrides) + live preview math.
 * PUT — upsert an override for a category (OWNER only — money safety).
 * DELETE ?category= — remove an override, reverting to the engine default.
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await listEffectiveProfiles();
  // Preview: what a $10.00-cost item would retail at under each profile.
  const withPreview = profiles.map((p) => ({
    ...p,
    preview_1000c: calculatePrice({
      costCents: 1000,
      shippingCents: p.profile.shippingBufferCents,
      targetMarginPct: p.profile.targetMarginPct,
      minProfitCents: p.profile.minProfitCents,
      rounding: p.profile.rounding,
    }).retailCents,
  }));
  return NextResponse.json({ profiles: withPreview, viewer_role: team.role });
}

export async function PUT(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  try {
    const body = await req.json();
    const category = String(body.category ?? "").trim().toLowerCase();
    const margin = Number(body.target_margin_pct);
    const minProfit = Math.round(Number(body.min_profit_cents));
    const shipBuffer = Math.round(Number(body.shipping_buffer_cents));
    const rounding = String(body.rounding ?? "charm_99") as RoundingStrategy;

    if (!category || !/^[a-z0-9-]{2,40}$/.test(category)) {
      return NextResponse.json({ error: "Valid category slug required." }, { status: 400 });
    }
    if (!Number.isFinite(margin) || margin < 0 || margin > 0.95) {
      return NextResponse.json({ error: "Margin must be between 0 and 0.95." }, { status: 400 });
    }
    if (!Number.isFinite(minProfit) || minProfit < 0 || minProfit > 100000) {
      return NextResponse.json({ error: "Min profit must be 0–$1000." }, { status: 400 });
    }
    if (!Number.isFinite(shipBuffer) || shipBuffer < 0 || shipBuffer > 100000) {
      return NextResponse.json({ error: "Shipping buffer must be 0–$1000." }, { status: 400 });
    }
    if (!ROUNDINGS.has(rounding)) {
      return NextResponse.json({ error: "Invalid rounding strategy." }, { status: 400 });
    }

    const { error } = await supabaseAdmin().from("pricing_rules").upsert({
      category,
      target_margin_pct: margin,
      min_profit_cents: minProfit,
      shipping_buffer_cents: shipBuffer,
      rounding,
      notes: (body.notes ? String(body.notes) : "").slice(0, 300) || null,
      updated_by: team.user.id,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Pricing rule upsert error", error);
      return NextResponse.json({ error: "Failed to save rule." }, { status: 500 });
    }
    invalidatePricingRulesCache();
    return NextResponse.json({ ok: true, category });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const category = new URL(req.url).searchParams.get("category");
  if (!category) return NextResponse.json({ error: "category required." }, { status: 400 });

  const { error } = await supabaseAdmin().from("pricing_rules").delete().eq("category", category);
  if (error) return NextResponse.json({ error: "Failed to remove override." }, { status: 500 });
  invalidatePricingRulesCache();
  return NextResponse.json({ ok: true });
}

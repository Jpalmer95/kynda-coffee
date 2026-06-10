import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/par-counts?days=7 — recent counts (team).
 * POST — submit a count (any team member). Multiple items per call supported:
 *   { counts: [{ item_name, area?, unit?, par_level?, counted_qty, notes? }] }
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10) || 7, 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin()
    .from("par_counts")
    .select("id, item_name, area, unit, par_level, counted_qty, notes, counted_at, profiles:counted_by (full_name)")
    .gte("counted_at", since)
    .order("counted_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Par counts fetch error", error);
    return NextResponse.json({ error: "Failed to load par counts." }, { status: 500 });
  }
  return NextResponse.json({ counts: data ?? [] });
}

const AREAS = new Set(["general", "bar", "kitchen", "retail", "bakery", "storage"]);

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const rawCounts = Array.isArray(body.counts) ? body.counts : [body];

    const rows = [];
    for (const c of rawCounts.slice(0, 50)) {
      const item = String(c.item_name ?? "").trim();
      const qty = Number(c.counted_qty);
      if (!item || !Number.isFinite(qty) || qty < 0) continue;
      rows.push({
        item_name: item.slice(0, 120),
        area: AREAS.has(c.area) ? c.area : "general",
        unit: String(c.unit ?? "each").slice(0, 24),
        par_level: Number.isFinite(Number(c.par_level)) ? Number(c.par_level) : null,
        counted_qty: qty,
        notes: (c.notes ? String(c.notes) : "").slice(0, 300) || null,
        counted_by: team.user.id,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid counts provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .from("par_counts")
      .insert(rows)
      .select("id, item_name, counted_qty");

    if (error) {
      console.error("Par counts insert error", error);
      return NextResponse.json({ error: "Failed to save counts." }, { status: 500 });
    }
    return NextResponse.json({ saved: data?.length ?? 0, counts: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

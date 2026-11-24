import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireTier } from "@/lib/auth/team";

export const dynamic = "force-dynamic";

const ALLOWED_STORE_SETTINGS_KEYS = [
  "store_name",
  "support_email",
  "phone",
  "address",
  "free_shipping_threshold_cents",
  "flat_shipping_cents",
  "tax_rate_percent",
  "enable_reviews",
  "enable_loyalty",
  "enable_sms",
] as const;

// GET current settings (owner-only; strips internal VLM secrets)
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin()
      .from("store_settings")
      .select("settings_json")
      .eq("id", 1)
      .single();

    if (error || !data?.settings_json) {
      return NextResponse.json({ settings: null });
    }

    const raw = data.settings_json as Record<string, unknown>;
    const safeSettings: Record<string, unknown> = {};
    for (const key of ALLOWED_STORE_SETTINGS_KEYS) {
      if (key in raw) safeSettings[key] = raw[key];
    }

    return NextResponse.json({ settings: safeSettings });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

// POST save settings (owner-only; allowlisted merge preserves nested vlm config)
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const db = supabaseAdmin();

    const { data: existing } = await db
      .from("store_settings")
      .select("settings_json")
      .eq("id", 1)
      .maybeSingle();

    const merged: Record<string, unknown> = {
      ...((existing?.settings_json as Record<string, unknown>) ?? {}),
    };
    for (const key of ALLOWED_STORE_SETTINGS_KEYS) {
      if (key in body) merged[key] = body[key];
    }

    const { error } = await db
      .from("store_settings")
      .upsert({ id: 1, settings_json: merged, updated_at: new Date().toISOString() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save settings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

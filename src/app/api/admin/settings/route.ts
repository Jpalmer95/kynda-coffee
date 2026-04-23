import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET current settings
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("store_settings")
      .select("settings_json")
      .eq("id", 1)
      .single();

    if (error) {
      // Return defaults if no settings row exists
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({ settings: data?.settings_json ?? null });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

// POST save settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { error } = await supabaseAdmin()
      .from("store_settings")
      .upsert({ id: 1, settings_json: body, updated_at: new Date().toISOString() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save settings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

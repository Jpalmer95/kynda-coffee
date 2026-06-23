// /api/admin/settings/vlm — Vision Language Model configuration
// GET  → current VLM config (masks api_key)
// POST → save VLM config, or test if ?test=true

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getVlmConfig, type VlmConfig } from "@/lib/marketing/vlm";

export const dynamic = "force-dynamic";

/** GET — return current VLM config (api_key masked). */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getVlmConfig(supabaseAdmin());

  return NextResponse.json({
    config: {
      ...config,
      api_key: config.api_key ? "***" : "",
    },
  });
}

/** POST — save VLM config, or test it if ?test=true. */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isTest = searchParams.get("test") === "true";

  try {
    const body = await req.json();
    const config: VlmConfig = {
      provider: body.provider || "local",
      model: body.model || "",
      api_base: body.api_base || "http://127.0.0.1:1234/v1",
      api_key: body.api_key || "",
    };

    if (!config.model || !config.api_base) {
      return NextResponse.json({ error: "model and api_base are required" }, { status: 400 });
    }

    // Test mode: try a minimal chat completion to verify connectivity
    if (isTest) {
      try {
        const res = await fetch(config.api_base + "/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + config.api_key,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 5,
            messages: [{ role: "user", content: "Hi" }],
          }),
        });

        if (res.ok) {
          return NextResponse.json({ ok: true, message: "Model responded successfully" });
        }

        const errText = await res.text().catch(() => "");
        return NextResponse.json(
          { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 300)}` },
          { status: 200 }
        );
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "Connection failed" },
          { status: 200 }
        );
      }
    }

    // Save mode: merge into existing settings_json
    const db = supabaseAdmin();
    const { data: existing } = await db
      .from("store_settings")
      .select("settings_json")
      .eq("id", 1)
      .single();

    const settingsJson = (existing?.settings_json as Record<string, unknown>) || {};
    settingsJson.vlm = config;

    const { error } = await db
      .from("store_settings")
      .upsert({
        id: 1,
        settings_json: settingsJson,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[settings/vlm] save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}

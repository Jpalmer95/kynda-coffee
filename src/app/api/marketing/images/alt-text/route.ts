// POST /api/marketing/images/alt-text
// Generates alt-text using a configurable vision-language model.
// Supports Hugging Face, local LM Studio, or any OpenAI-compatible API.

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getVlmConfig, generateAltText, VlmError } from "@/lib/marketing/vlm";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json({ error: "image_url required" }, { status: 400 });
    }

    const config = await getVlmConfig(supabaseAdmin());

    if (!config.api_key && config.provider !== "local") {
      return NextResponse.json(
        {
          error:
            "AI service not configured. Go to Admin → Settings → AI Vision to configure a provider.",
        },
        { status: 503 }
      );
    }

    const analysis = await generateAltText(config, image_url);

    return NextResponse.json({ success: true, image_url, analysis });
  } catch (error) {
    console.error("[alt-text] Error:", error);

    if (error instanceof VlmError) {
      const friendly: Record<number, string> = {
        402: "Free credits exhausted. Configure a local model in Settings → AI Vision, or purchase HF credits.",
        404: "Model not available on this provider. Try a different model in Settings → AI Vision.",
        429: "Rate limited. Try again in a moment, or use a local model.",
        502: "Vision model temporarily unavailable. Try again later.",
        503: "Service unavailable. Check your configuration.",
      };
      const message = friendly[error.status] || `AI service error: ${error.status}`;
      return NextResponse.json({ error: message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

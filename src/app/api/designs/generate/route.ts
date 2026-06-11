import { NextRequest, NextResponse } from "next/server";
import { generateDesign as falGenerate, KYND_STYLE_PRESETS } from "@/lib/fal/client";
import { moderateText } from "@/lib/moderation/client";
import { buildGenerationPrompt, type DesignTheme } from "@/lib/designs/recommendations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/designs/generate  (Epic 8)
 *
 * Real AI generation via FAL (flux/dev) with a brand-aware, print-ready prompt
 * and a text-moderation gate. Falls back to a placeholder only when FAL_KEY is
 * not configured, so the studio still works in dev/demo.
 *
 * Body: { prompt, style_preset?, product_type?, theme?, brand_aware? }
 */
export async function POST(req: NextRequest) {
  try {
    // AI generation costs money per call — rate-limit hard (10/min/IP).
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "designs-generate", windowMs: 60_000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many generations. Please slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await req.json();
    const prompt = String(body.prompt ?? "").trim();
    const stylePresetKey = String(body.style_preset ?? "");
    const theme = body.theme as DesignTheme | undefined;
    const brandAware = Boolean(body.brand_aware);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1) Moderate the user's prompt before spending a generation.
    try {
      const mod = await moderateText(prompt);
      if (!mod.safe) {
        return NextResponse.json(
          {
            error: "prompt_rejected",
            message:
              "Your prompt contains content that isn't appropriate for custom merchandise. Please revise and try again.",
            flagged_categories: mod.flagged_categories,
          },
          { status: 422 }
        );
      }
    } catch {
      // moderation failure shouldn't hard-block; proceed (FAL has its own safety checker)
    }

    // 2) Resolve style: map a known preset key to its descriptor, else pass through.
    const styleDescriptor =
      (KYND_STYLE_PRESETS as Record<string, string>)[stylePresetKey] ?? stylePresetKey;

    // 3) Build a brand-aware, print-ready prompt.
    const fullPrompt = buildGenerationPrompt({
      idea: prompt,
      theme,
      style: styleDescriptor,
      brandAware,
    });

    // 4) Generate via FAL when configured; otherwise return a demo placeholder.
    if (!process.env.FAL_KEY) {
      return NextResponse.json({
        success: true,
        image_url: "https://picsum.photos/seed/kynda-design/1024/1024",
        prompt: fullPrompt,
        demo: true,
        note: "FAL_KEY not configured — returning placeholder.",
      });
    }

    const result = await falGenerate(prompt, { style_preset: styleDescriptor });
    const image = result.images?.[0];
    if (!image?.url) {
      return NextResponse.json({ error: "Image generation returned no image." }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      image_url: image.url,
      prompt: fullPrompt,
      width: image.width,
      height: image.height,
      demo: false,
    });
  } catch (e: any) {
    console.error("[designs/generate] error:", e);
    const msg: string = e?.message ?? "Generation failed";
    // Misconfigured/expired FAL key — surface a friendly, actionable message
    if (msg.includes("401") || msg.toLowerCase().includes("authentication")) {
      return NextResponse.json(
        { error: "AI generation is temporarily unavailable. Please try again later or upload your own design." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

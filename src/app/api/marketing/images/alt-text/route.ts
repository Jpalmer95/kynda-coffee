// POST /api/marketing/images/alt-text
// Generates alt-text and descriptive captions for a marketing image.
//
// Uses Hugging Face's inference router (OpenAI-compatible API) with a free
// vision-language model. Falls back to simple image-to-text captioning if
// the VLM is unavailable.
//
// Env: HF_TOKEN (free tier — get one at https://huggingface.co/settings/tokens)

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";

export const runtime = "nodejs";
export const maxDuration = 30;

const HF_ROUTER = "https://router.huggingface.co/v1";
// Free vision-language model available on HF inference providers
const VLM_MODEL = "meta-llama/Llama-4-Scout-17B-16E-Instruct";

interface AltTextResult {
  alt_text: string;
  descriptive_caption: string;
  subjects: string[];
  colors: string[];
  setting: string;
  suggested_hashtags: string[];
  brightness: string;
  quality_notes: string;
}

const FALLBACK: AltTextResult = {
  alt_text: "Marketing image",
  descriptive_caption: "",
  subjects: [],
  colors: [],
  setting: "unknown",
  suggested_hashtags: [],
  brightness: "normal",
  quality_notes: "AI analysis unavailable",
};

export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json({ error: "image_url required" }, { status: 400 });
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return NextResponse.json(
        { error: "AI service not configured. Add HF_TOKEN to environment (free at huggingface.co/settings/tokens)." },
        { status: 503 }
      );
    }

    const prompt = `Analyze this marketing image for Kynda Coffee (a specialty coffee shop in Horseshoe Bay, Texas). Return ONLY a JSON object with exactly these fields, no markdown, no explanation:

{
  "alt_text": "Concise alt text for accessibility (max 125 characters, describe key visual elements only, no promotional language)",
  "descriptive_caption": "A 1-2 sentence engaging description suitable for social media captions. Warm, craft-focused tone.",
  "subjects": ["list of key subjects/objects visible in the image"],
  "colors": ["dominant colors in the image"],
  "setting": "indoor/outdoor/studio/etc",
  "suggested_hashtags": ["5-8 relevant hashtags for this specific image content"],
  "brightness": "dark/normal/bright",
  "quality_notes": "any quality observations (sharp, blurry, well-lit, etc.)"
}`;

    // Use Hugging Face inference router (OpenAI-compatible chat completions)
    const response = await fetch(`${HF_ROUTER}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        model: VLM_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: image_url },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[alt-text] HF API error:", response.status, errText);

      // If the VLM model isn't available, try a fallback model
      if (response.status === 404 || response.status === 502) {
        return NextResponse.json(
          { error: "Vision model temporarily unavailable. Try again later." },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    // Parse JSON from the response
    let analysis: AltTextResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback: construct from raw text
      analysis = {
        ...FALLBACK,
        alt_text: text.slice(0, 125) || FALLBACK.alt_text,
        descriptive_caption: text.slice(0, 300),
      };
    }

    return NextResponse.json({
      success: true,
      image_url,
      analysis,
    });
  } catch (error) {
    console.error("[marketing/images/alt-text] Error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

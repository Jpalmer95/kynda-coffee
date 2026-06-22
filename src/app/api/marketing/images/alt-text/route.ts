// POST /api/marketing/images/alt-text
// Uses Claude Vision to generate alt-text and descriptive captions for a marketing image

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json({ error: "image_url required" }, { status: 400 });
    }

    const client = getClient();

    // Determine media type from URL
    const mediaType = image_url.includes(".png")
      ? "image/png"
      : image_url.includes(".webp")
      ? "image/webp"
      : "image/jpeg";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: image_url,
              },
            },
            {
              type: "text",
              text: `Analyze this marketing image for Kynda Coffee (a specialty coffee shop in Horseshoe Bay, Texas). Return a JSON object with exactly these fields:

{
  "alt_text": "Concise alt text for accessibility (max 125 characters, describe key visual elements only, no promotional language)",
  "descriptive_caption": "A 1-2 sentence engaging description suitable for social media captions. Warm, craft-focused tone.",
  "subjects": ["list of key subjects/objects visible in the image"],
  "colors": ["dominant colors in the image"],
  "setting": "indoor/outdoor/studio/etc",
  "suggested_hashtags": ["5-8 relevant hashtags for this specific image content"],
  "brightness": "dark/normal/bright",
  "quality_notes": "any quality observations (sharp, blurry, well-lit, etc.)"
}`,
            },
          ],
        },
      ],
    });

    // Parse response
    const textBlock = response.content.find((b) => b.type === "text");
    const text = (textBlock as { text: string } | undefined)?.text || "";

    // Try to extract JSON from response
    let analysis;
    try {
      // Find JSON in the response (might have markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback: return raw text
      analysis = {
        alt_text: text.slice(0, 125),
        descriptive_caption: text.slice(0, 300),
        subjects: [],
        colors: [],
        setting: "unknown",
        suggested_hashtags: [],
        brightness: "normal",
        quality_notes: "Could not parse structured analysis",
      };
    }

    return NextResponse.json({
      success: true,
      image_url,
      analysis,
    });
  } catch (error) {
    console.error("[marketing/images/alt-text] Error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";

    if (message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

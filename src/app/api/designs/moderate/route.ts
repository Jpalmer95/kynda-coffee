import { NextRequest, NextResponse } from "next/server";
import { moderateText, moderateImage } from "@/lib/moderation/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/designs/moderate
 *
 * Content moderation gate for the Design Studio.
 * Called before AI generation and before Add to Cart.
 *
 * Body:
 *   { text?: string, image_url?: string }
 *
 * Response:
 *   { safe: boolean, flagged_categories: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, image_url } = body;

    // Moderate text prompt
    if (text && typeof text === "string" && text.trim().length > 0) {
      const textResult = await moderateText(text.trim());

      if (!textResult.safe) {
        return NextResponse.json({
          safe: false,
          reason: "text",
          flagged_categories: textResult.flagged_categories,
          message: "Your prompt contains content that isn't appropriate for custom merchandise. Please revise and try again.",
        });
      }
    }

    // Moderate image URL (generated design or canvas export)
    if (image_url && typeof image_url === "string" && image_url.length > 0) {
      const imageResult = await moderateImage(image_url);

      if (!imageResult.safe) {
        return NextResponse.json({
          safe: false,
          reason: "image",
          flagged_categories: imageResult.flagged_categories,
          message: "This design contains content that isn't appropriate for custom merchandise. Please modify your design or choose a different one.",
        });
      }
    }

    // All clear
    return NextResponse.json({
      safe: true,
      flagged_categories: [],
    });
  } catch (err: any) {
    console.error("[Designs Moderate] Error:", err);
    // Fail open — don't block the user
    return NextResponse.json({ safe: true, flagged_categories: [] });
  }
}

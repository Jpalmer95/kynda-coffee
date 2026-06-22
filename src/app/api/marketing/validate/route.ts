import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { validateXPost, validateGenericPost } from "@/lib/marketing/validators/x-algorithm";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/validate
 * Validates a draft social post against platform rules and the X algorithm.
 *
 * Body: { platform, text, hasImage?, hasVideo?, isThread?, isReply?, recentPostCount24h? }
 * Returns: XValidationResult | GenericValidationResult
 */
export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { platform, text } = body;

    if (!platform || typeof platform !== "string") {
      return NextResponse.json({ error: "platform is required" }, { status: 400 });
    }
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const hasImage = body.hasImage === true;
    const hasVideo = body.hasVideo === true;
    const isThread = body.isThread === true;
    const isReply = body.isReply === true;
    const recentPostCount24h =
      typeof body.recentPostCount24h === "number" ? body.recentPostCount24h : undefined;

    // X gets the full algorithm validator; other platforms get generic validation.
    if (platform === "twitter") {
      const result = validateXPost({
        text,
        hasImage,
        hasVideo,
        isThread,
        isReply,
        recentPostCount24h,
      });
      return NextResponse.json({ platform: "twitter", ...result });
    }

    const result = validateGenericPost(text, platform, hasImage || hasVideo);
    return NextResponse.json({ platform, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "Validation failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

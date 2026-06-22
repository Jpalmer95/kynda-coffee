import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { createSocialPost } from "@/lib/marketing/social/publisher";

export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { platform, text, image_urls, scheduled_at, status } = body;

    if (!platform || !text) {
      return NextResponse.json(
        { error: "platform and text are required" },
        { status: 400 }
      );
    }

    if (!["instagram", "twitter", "facebook", "tiktok"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be instagram, twitter, facebook, or tiktok" },
        { status: 400 }
      );
    }

    if (status && !["draft", "scheduled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be draft or scheduled" },
        { status: 400 }
      );
    }

    if (status === "scheduled" && !scheduled_at) {
      return NextResponse.json(
        { error: "scheduled_at is required when status is scheduled" },
        { status: 400 }
      );
    }

    const result = await createSocialPost({
      platform,
      text,
      image_urls,
      scheduled_at,
      status,
      created_by: team.user.id,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Error scheduling post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

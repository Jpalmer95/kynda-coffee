import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { publishPostById } from "@/lib/marketing/social/publisher";

export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, "manager");
    if (!team) return NextResponse.json({ error: "Unauthorized — manager+ required" }, { status: 401 });

    const body = await req.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json({ error: "post_id is required" }, { status: 400 });
    }

    const result = await publishPostById(post_id);

    return NextResponse.json({
      success: result.success,
      platform: result.platform,
      external_id: result.external_id,
      error: result.error,
    });
  } catch (error) {
    console.error("Error publishing post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

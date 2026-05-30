import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { buildDraftsFromDrop, type ContentDropInput, type DropPlatform } from "@/lib/marketing/content-drop";
import { createOpenAICaptionFn } from "@/lib/marketing/caption/openai";
import { createSocialPost } from "@/lib/marketing/social/publisher";
import { moderateText, moderateImage } from "@/lib/moderation/client";

export const dynamic = "force-dynamic";

const VALID_PLATFORMS: DropPlatform[] = ["instagram", "facebook", "twitter", "tiktok"];

/**
 * Content-Drop pipeline endpoint.
 *
 * POST a dropped image (+ optional title/notes/specialId/platforms/hashtags).
 * We generate platform-specific captions (OpenAI vision, brand fallback if it
 * fails), moderate each draft, and persist the safe ones into the marketing
 * APPROVAL QUEUE (status=pending_approval, source=content_drop). Nothing is
 * published — the owner approves from /admin/marketing/approvals.
 */
export async function POST(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<ContentDropInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  // Image moderation (fails open when no key — same posture as moderation client).
  const imgMod = await moderateImage(imageUrl);
  if (!imgMod.safe) {
    return NextResponse.json(
      { error: "Image failed moderation", flagged: imgMod.flagged_categories },
      { status: 422 }
    );
  }

  const platforms = Array.isArray(body.platforms)
    ? (body.platforms.filter((p) => VALID_PLATFORMS.includes(p as DropPlatform)) as DropPlatform[])
    : undefined;

  const input: ContentDropInput = {
    imageUrl,
    title: typeof body.title === "string" ? body.title : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    specialId: typeof body.specialId === "string" ? body.specialId : undefined,
    platforms: platforms && platforms.length ? platforms : undefined,
    hashtags: Array.isArray(body.hashtags) ? body.hashtags.filter((h) => typeof h === "string") : undefined,
  };

  let drafts;
  try {
    drafts = await buildDraftsFromDrop(input, createOpenAICaptionFn());
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to build drafts", details: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }

  const created: { id: string; platform: string }[] = [];
  const skipped: { platform: string; reason: string }[] = [];

  for (const d of drafts) {
    const textMod = await moderateText(d.text);
    if (!textMod.safe) {
      skipped.push({ platform: d.platform, reason: `flagged: ${textMod.flagged_categories.join(", ")}` });
      continue;
    }
    const result = await createSocialPost({
      platform: d.platform,
      text: d.text,
      image_urls: d.image_urls,
      status: "pending_approval",
      source: "content_drop",
      special_id: d.special_id,
      created_by: user.id,
    });
    if ("id" in result) {
      created.push({ id: result.id, platform: d.platform });
    } else {
      skipped.push({ platform: d.platform, reason: result.error });
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    message: `Drafted ${created.length} post(s) to the approval queue.`,
  });
}

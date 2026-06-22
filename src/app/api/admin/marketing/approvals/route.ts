import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { approvePost, rejectPost, listSocialPosts } from "@/lib/marketing/social/publisher";

export const dynamic = "force-dynamic";

/**
 * Marketing approval queue.
 * GET  — list posts (defaults to the pending_approval queue; ?status= to filter).
 * POST — { action: "approve" | "reject", postId, reason? } applies the approval gate.
 *
 * The approval gate itself lives in publisher.ts and is enforced at the data layer:
 * agent-sourced posts can only ever land in pending_approval, and only an owner
 * approval can move a post toward scheduled/approved (publishable).
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const status = params.get("status") ?? "pending_approval";
  const platform = params.get("platform") ?? undefined;
  const limit = Number(params.get("limit") ?? 50);

  const { posts, total, error } = await listSocialPosts({
    status: status === "all" ? undefined : status,
    platform,
    limit,
  });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ posts, total });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, postId, reason } = await req.json();
    if (!postId || typeof postId !== "string") {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approvePost(postId, team.user.id);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ ok: true, status: result.status });
    }

    if (action === "reject") {
      const result = await rejectPost(postId, team.user.id, typeof reason === "string" ? reason : undefined);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action. Use 'approve' or 'reject'." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "Request failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

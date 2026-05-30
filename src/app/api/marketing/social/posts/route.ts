import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { listSocialPosts, getPlatforms } from "@/lib/marketing/social/publisher";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["admin", "employee"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let postsResult;
    try {
      postsResult = await listSocialPosts({ status, platform, limit, offset });
    } catch (dbError) {
      // Graceful degradation: if the social_posts table doesn't exist or
      // query fails for any reason, return empty data instead of 500.
      // Admin sees "No posts yet" and can configure social features later.
      console.warn(
        "[social-posts] query failed, returning empty set:",
        dbError instanceof Error ? dbError.message : String(dbError)
      );
      return NextResponse.json({
        posts: [],
        total: 0,
        platforms: getPlatforms(),
        degraded: true,
      });
    }

    if (postsResult.error) {
      // Soft error (e.g., table not found) — return empty rather than 500
      console.warn("[social-posts] listSocialPosts error:", postsResult.error);
      return NextResponse.json({
        posts: [],
        total: 0,
        platforms: getPlatforms(),
        degraded: true,
        error_hint: postsResult.error,
      });
    }

    return NextResponse.json({
      posts: postsResult.posts,
      total: postsResult.total,
      platforms: getPlatforms(),
    });
  } catch (error) {
    // Catch-all: return empty set rather than 500 to prevent client re-render loops
    console.error("Error listing posts:", error);
    return NextResponse.json({
      posts: [],
      total: 0,
      platforms: [],
      degraded: true,
      error_hint: error instanceof Error ? error.message : "unknown",
    });
  }
}


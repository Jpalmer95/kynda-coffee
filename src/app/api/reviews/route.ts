import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getTeamUser } from "@/lib/auth/team";

export const dynamic = "force-dynamic";

// GET /api/reviews?product_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

    if (!productId) {
      return NextResponse.json({ error: "product_id required" }, { status: 400 });
    }

    // Never expose reviewer email addresses publicly
    const { data: reviews, error } = await supabaseAdmin()
      .from("reviews")
      .select("id, product_id, name, rating, title, body, is_verified_purchase, helpful_count, created_at")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Reviews fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }

    // Calculate aggregate
    const avgRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews?.filter((r) => r.rating === star).length ?? 0,
    }));

    return NextResponse.json({
      reviews: reviews ?? [],
      average_rating: Number(avgRating.toFixed(1)),
      total_count: reviews?.length ?? 0,
      distribution,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  try {
    // Spam guard: 5 review submissions/min/IP.
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "reviews", windowMs: 60_000, maxRequests: 5 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await req.json();
    const { product_id, email, name, rating, title, body: reviewBody } = body;

    if (!product_id || !email || !rating || !reviewBody) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, email, rating, body" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be an integer 1-5" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    // Only mark verified purchase when the caller is authenticated as that email
    // (prevents unauthenticated purchase-history oracle & spoofing).
    const sessionUser = await getTeamUser(req);
    const authedEmail = sessionUser?.user.email?.trim().toLowerCase();
    let hasPurchased = false;
    if (authedEmail && authedEmail === normalizedEmail) {
      const { data: orders } = await supabaseAdmin()
        .from("orders")
        .select("items")
        .eq("email", authedEmail)
        .in("status", ["confirmed", "processing", "shipped", "delivered"]);

      hasPurchased =
        orders?.some((order: any) =>
          (order.items ?? []).some((item: any) => item.product_id === product_id)
        ) ?? false;
    }

    const { data: review, error } = await supabaseAdmin()
      .from("reviews")
      .insert({
        product_id,
        user_id: sessionUser?.user.id ?? null,
        email: normalizedEmail,
        name: String(name || "Anonymous").trim().slice(0, 80),
        rating,
        title: title ? String(title).trim().slice(0, 120) : null,
        body: String(reviewBody).trim().slice(0, 2000),
        is_verified_purchase: hasPurchased,
        // Force moderation on all new submissions (matches migration 056)
        is_approved: false,
      })
      .select("id, product_id, name, rating, title, body, is_verified_purchase, is_approved, created_at")
      .single();

    if (error) {
      console.error("Review create error:", error);
      return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

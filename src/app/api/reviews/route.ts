import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/reviews?product_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    if (!productId) {
      return NextResponse.json({ error: "product_id required" }, { status: 400 });
    }

    const { data: reviews, error } = await supabaseAdmin()
      .from("reviews")
      .select("*")
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
    const body = await req.json();
    const { product_id, email, name, rating, title, body: reviewBody } = body;

    if (!product_id || !email || !rating || !reviewBody) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, email, rating, body" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    // Check if user has purchased this product (verified purchase)
    const { data: orders } = await supabaseAdmin()
      .from("orders")
      .select("items")
      .eq("email", email)
      .in("status", ["confirmed", "processing", "shipped", "delivered"]);

    const hasPurchased =
      orders?.some((order: any) =>
        (order.items ?? []).some(
          (item: any) => item.product_id === product_id
        )
      ) ?? false;

    const { data: review, error } = await supabaseAdmin()
      .from("reviews")
      .insert({
        product_id,
        email,
        name: name || "Anonymous",
        rating,
        title: title || null,
        body: reviewBody,
        is_verified_purchase: hasPurchased,
        is_approved: true, // Auto-approve for now; can be moderated later
      })
      .select()
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

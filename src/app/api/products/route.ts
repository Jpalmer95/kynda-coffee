import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Force dynamic — don't try to build statically (needs env vars at runtime)
export const dynamic = "force-dynamic";

// GET /api/products — list products with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let query = supabaseAdmin()
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (featured === "true") query = query.eq("is_featured", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data });
}

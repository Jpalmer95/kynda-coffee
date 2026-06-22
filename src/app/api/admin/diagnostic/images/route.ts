import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/diagnostic/images
 *
 * Returns image-coverage stats across all three product sources:
 *   1. pos_items (Square POS — Menu, QR, Shop)
 *   2. products (legacy online shop table)
 *   3. Printful mockups (Design Studio — stored in Supabase Storage 'mockups' bucket)
 *
 * Also includes:
 *   - recent sync log entries
 *   - list of items/categories missing images (first 50)
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  // 1. pos_items — count with and without images
  const { data: posItems } = await db
    .from("pos_items")
    .select("id, name, category_name, item_type, image_urls, is_active");

  const posTotal = (posItems ?? []).filter((i: any) => i.is_active).length;
  const posWithImages = (posItems ?? []).filter(
    (i: any) => i.is_active && Array.isArray(i.image_urls) && i.image_urls.length > 0
  ).length;
  const posMissing = (posItems ?? [])
    .filter((i: any) => i.is_active && (!Array.isArray(i.image_urls) || i.image_urls.length === 0))
    .slice(0, 50)
    .map((i: any) => ({ name: i.name, category: i.category_name, type: i.item_type }));

  // 2. products table
  const { data: products } = await db
    .from("products")
    .select("id, name, category, images, image_urls, is_active");

  const prodTotal = (products ?? []).filter((p: any) => p.is_active).length;
  const prodWithImages = (products ?? []).filter((p: any) => {
    if (!p.is_active) return false;
    const imgs = p.images ?? p.image_urls;
    return Array.isArray(imgs) && imgs.length > 0;
  }).length;
  const prodMissing = (products ?? [])
    .filter((p: any) => {
      if (!p.is_active) return false;
      const imgs = p.images ?? p.image_urls;
      return !Array.isArray(imgs) || imgs.length === 0;
    })
    .slice(0, 50)
    .map((p: any) => ({ name: p.name, category: p.category }));

  // 3. Square sync log (recent runs)
  const { data: syncLogs } = await db
    .from("square_sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  // 4. pos_sync_runs (newer log table)
  const { data: posRuns } = await db
    .from("pos_sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  // 5. Mockups bucket file count
  let mockupCount = 0;
  try {
    const { data: files } = await db.storage.from("mockups").list("");
    mockupCount = files?.length ?? 0;
  } catch {
    // bucket may not exist
  }

  return NextResponse.json({
    pos: { total: posTotal, withImages: posWithImages, missing: posMissing },
    products: { total: prodTotal, withImages: prodWithImages, missing: prodMissing },
    mockups: { files: mockupCount },
    recentSyncLogs: syncLogs ?? [],
    recentPosRuns: posRuns ?? [],
  });
}

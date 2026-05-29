import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PRINTFUL_CATALOG } from "@/lib/printful/catalog";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/mockups/sync
 *
 * Fetches real mockup images from Printful for each catalog product,
 * downloads the bytes, and re-hosts in Supabase Storage `mockups/` bucket.
 *
 * Returns: { results: [{ product_id, front, back, status }] }
 * Requires: PRINTFUL_API_KEY env var (set in Coolify).
 * Can be triggered from admin dashboard via a "Sync Mockups" button.
 * Idempotent — overwrites existing files with the same key.
 */
export async function POST(req: NextRequest) {
  // Auth gate — only authenticated admins
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PRINTFUL_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  const db = supabaseAdmin();
  const results: Array<{
    product_id: string;
    printful_id: number;
    front?: string;
    back?: string;
    status: "ok" | "no_mockups" | "error";
    error?: string;
  }> = [];

  for (const product of PRINTFUL_CATALOG) {
    try {
      // Fetch mockup file URLs from Printful /store/products/{id}
      const res = await fetch(
        `https://api.printful.com/store/products/${product.printfulId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!res.ok) {
        results.push({
          product_id: product.id,
          printful_id: product.printfulId,
          status: "no_mockups",
          error: `Printful ${res.status}: ${res.statusText}`,
        });
        continue;
      }

      const data = await res.json();
      const syncProduct = data.result?.sync_product;
      if (!syncProduct?.mockups?.length) {
        results.push({
          product_id: product.id,
          printful_id: product.printfulId,
          status: "no_mockups",
          error: "No mockup files returned from Printful",
        });
        continue;
      }

      // Pick front + back mockups (prefer "front" placement, then anything)
      const frontMockup = syncProduct.mockups.find(
        (m: any) => m.placement === "front"
      ) ?? syncProduct.mockups[0];
      const backMockup = syncProduct.mockups.find(
        (m: any) => m.placement === "back"
      );

      const uploaded: { front?: string; back?: string } = {};

      if (frontMockup?.mockup_url) {
        const url = await downloadAndUpload(
          db,
          frontMockup.mockup_url,
          `/${product.id}-front.jpg`
        );
        if (url) uploaded.front = url;
      }
      if (backMockup?.mockup_url) {
        const url = await downloadAndUpload(
          db,
          backMockup.mockup_url,
          `/${product.id}-back.jpg`
        );
        if (url) uploaded.back = url;
      }

      if (uploaded.front || uploaded.back) {
        results.push({
          product_id: product.id,
          printful_id: product.printfulId,
          ...uploaded,
          status: "ok",
        });
      } else {
        results.push({
          product_id: product.id,
          printful_id: product.printfulId,
          status: "error",
          error: "Mockup URLs found but upload failed",
        });
      }
    } catch (err: any) {
      results.push({
        product_id: product.id,
        printful_id: product.printfulId,
        status: "error",
        error: err.message,
      });
    }
  }

  return NextResponse.json({ success: true, results });
}

/** GET — dry run: list what mockup URLs are currently configured */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inventory = PRINTFUL_CATALOG.map((p) => ({
    product_id: p.id,
    printful_id: p.printfulId,
    placeholder_front: p.mockupImages.front,
    placeholder_back: p.mockupImages.back || null,
    fallback_image: p.imageUrl,
  }));

  return NextResponse.json({ products: inventory });
}

/** Download a remote URL and upload to Supabase Storage mockups/{path} */
async function downloadAndUpload(
  db: ReturnType<typeof supabaseAdmin>,
  remoteUrl: string,
  storagePath: string
): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await db.storage
      .from("mockups")
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
        cacheControl: "31536000", // 1 year
      });

    if (error) {
      console.error(`[Mockup sync] Upload failed for ${storagePath}:`, error.message);
      return null;
    }

    const { data: publicData } = db.storage.from("mockups").getPublicUrl(storagePath);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`[Mockup sync] Download/upload error for ${storagePath}:`, err);
    return null;
  }
}

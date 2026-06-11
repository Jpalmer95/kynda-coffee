import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/printful-image?url=<encoded printful cdn url>
 *
 * Same-origin proxy for Printful CDN images so the Konva design canvas can
 * load them with crossOrigin="anonymous" and still export (toDataURL).
 *
 * WHY: files.cdn.printful.com serves Access-Control-Allow-Origin headers
 * inconsistently — `/o/...` paths have them, `/products/...` paths do NOT.
 * Loading a no-CORS image into a canvas taints it and breaks thumbnail/print
 * exports, and with crossOrigin="anonymous" the image fails to load at all
 * (this was why some product mockups, e.g. the snapback, never rendered).
 *
 * Whitelisted to Printful CDN hosts only. Long immutable cache.
 */
const ALLOWED_HOSTS = new Set([
  "files.cdn.printful.com",
  "images.printful.com",
  "printful-upload.s3-accelerate.amazonaws.com",
]);

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      // Printful CDN sits behind Cloudflare; plain fetch is fine.
      headers: { "User-Agent": "KyndaCoffee-ImageProxy/1.0" },
      // Cache upstream fetches on the server for a day
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }

    const buf = await upstream.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy fetch failed" }, { status: 502 });
  }
}

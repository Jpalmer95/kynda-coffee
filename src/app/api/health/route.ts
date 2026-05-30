import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET/HEAD /api/health
 *
 * Ultralight connectivity probe used by the client OfflineBanner.
 * navigator.onLine is unreliable under some browsers/VPNs, so the
 * client does a HEAD request here to verify the server is reachable
 * before showing the "you're offline" banner.
 *
 * Must NOT touch any database or external service — it's just a
 * "Next.js server is alive" ping.
 */
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() }, { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

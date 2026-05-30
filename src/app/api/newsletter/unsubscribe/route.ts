import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://kyndacoffee.com";

function page(title: string, message: string): NextResponse {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
  <style>body{font-family:Georgia,serif;background:#f6f1e7;color:#2b2b2b;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.08)}
  h1{color:#b5572f;font-size:24px;margin:0 0 12px}p{color:#6f6257;line-height:1.6}a{color:#b5572f}</style></head>
  <body><div class="card"><h1>${title}</h1><p>${message}</p><p><a href="${SITE}">← Back to Kynda Coffee</a></p></div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * One-click unsubscribe. Linked from every newsletter via the subscriber's
 * stable unsubscribe_token. GET so it works from an email client; also handles
 * RFC 8058 List-Unsubscribe-Post (POST) for one-click inbox unsubscribe.
 */
async function unsubscribe(token: string | null): Promise<NextResponse> {
  if (!token) return page("Invalid link", "This unsubscribe link is missing its token.");

  const { data, error } = await getSupabaseAdmin()
    .from("newsletter_subscribers")
    .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();

  if (error) return page("Something went wrong", "We couldn't process your request. Please email hello@kyndacoffee.com.");
  if (!data) return page("Link not found", "This unsubscribe link is no longer valid. You may already be unsubscribed.");

  return page("You're unsubscribed", "You won't receive any more newsletters from us. We'll keep a seat warm if you ever want to come back.");
}

export async function GET(req: NextRequest) {
  return unsubscribe(new URL(req.url).searchParams.get("t"));
}

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post).
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("t");
  const result = await unsubscribe(token);
  // Inbox clients expect a 200; return JSON for the POST variant.
  return result.status === 200
    ? NextResponse.json({ success: true })
    : NextResponse.json({ success: false }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath, getCanonicalAppUrl } from "@/lib/auth/security";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("redirectTo") || searchParams.get("next");
  const next = sanitizeRedirectPath(rawNext, "/account");

  // Always use the production/app URL for redirects (prevents 0.0.0.0 issues from Supabase)
  const appUrl = getCanonicalAppUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, appUrl));
    }
  }

  return NextResponse.redirect(new URL("/account", appUrl));
}

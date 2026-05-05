import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const ADMIN_EMAILS = [
  ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ...(process.env.ADMIN_EMAIL?.split(",") ?? []),
]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account",
  "/account/forgot-password",
  "/account/reset-password",
]);

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const pathname = request.nextUrl.pathname;

  // Refresh auth session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes (pages only, not API)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
    if (!user) {
      const redirectUrl = new URL("/account", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect private account subroutes while keeping the account login page public.
  if (pathname.startsWith("/account") && !PUBLIC_ACCOUNT_PATHS.has(pathname)) {
    if (!user) {
      const redirectUrl = new URL("/account", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).+)",
  ],
};

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import {
  normalizeRole,
  hasTier,
  minTierForPath,
  isOwnerOnlyAdminPath,
  type RoleTier,
} from "@/lib/auth/roles";

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
  "/auth/callback",
]);

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const pathname = request.nextUrl.pathname;

  // Refresh auth session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // ── Tiered team access: /kds, /staff, /training, /admin (pages only) ──
  const minTier = pathname.startsWith("/api/") ? null : minTierForPath(pathname);
  if (minTier) {
    if (!user) {
      const redirectUrl = new URL("/account", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    let role: RoleTier;
    if (ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
      // Env allowlist = owner override; the owner can never be locked out.
      role = "owner";
    } else {
      // RLS allows users to read their own profile row.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = normalizeRole((profile as { role?: string } | null)?.role);
    }

    if (!hasTier(role, minTier)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Owner-only admin sections stay closed to managers.
    if (pathname.startsWith("/admin") && isOwnerOnlyAdminPath(pathname) && role !== "owner") {
      return NextResponse.redirect(new URL("/admin", request.url));
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

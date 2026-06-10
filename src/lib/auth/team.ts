import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRole, hasTier, type RoleTier } from "@/lib/auth/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const ADMIN_EMAILS = [
  ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ...(process.env.ADMIN_EMAIL?.split(",") ?? []),
]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface TeamUser {
  user: { id: string; email?: string };
  role: RoleTier;
}

/**
 * Resolve the signed-in user's role tier for API routes.
 *
 * - Emails on the ADMIN_EMAILS allowlist are always `owner` (env override so
 *   the owner can never be locked out by a bad profile row).
 * - Otherwise the tier comes from `profiles.role` (read with the service
 *   client so RLS quirks can't break auth checks).
 *
 * Returns null when the request has no authenticated user.
 */
export async function getTeamUser(req: NextRequest): Promise<TeamUser | null> {
  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return { user: { id: user.id, email: user.email ?? undefined }, role: "owner" };
  }

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeRole((profile as { role?: string } | null)?.role);
  return { user: { id: user.id, email: user.email ?? undefined }, role };
}

/** Like getTeamUser but enforces a minimum tier; null when below it. */
export async function requireTier(
  req: NextRequest,
  minTier: RoleTier
): Promise<TeamUser | null> {
  const team = await getTeamUser(req);
  if (!team || !hasTier(team.role, minTier)) return null;
  return team;
}

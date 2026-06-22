import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRole, hasTier, type RoleTier } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const ASSIGNABLE: RoleTier[] = ["customer", "staff", "manager", "owner"];

/**
 * GET /api/admin/team — list team members + recent customers (manager+).
 * POST /api/admin/team — invite a brand-new user by email with a role.
 *   - Creates the auth user (Supabase invite email) + profile row with the
 *     tier pre-set, so accounts that have never signed up can be added.
 *   - manager can invite `staff` only; owner can invite any tier.
 * PATCH /api/admin/team — change an existing user's role.
 *   - Only owners can change roles (any tier).
 *   - You can promote yourself but never demote yourself (lockout guard).
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  let query = supabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  } else {
    // Default view: existing team members only.
    query = query.in("role", [
      "owner", "admin", "manager", "lead", "team_lead",
      "staff", "employee", "team", "barista",
    ]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Team list error", error);
    return NextResponse.json({ error: "Failed to load team." }, { status: 500 });
  }

  const members = (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    raw_role: p.role,
    role: normalizeRole(p.role as string),
    created_at: p.created_at,
  }));

  return NextResponse.json({ members, viewer_role: team.role });
}

/** POST — invite a new user by email with a starting role. */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized — owner only." }, { status: 401 });

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = (body.role ?? "staff") as RoleTier;
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!ASSIGNABLE.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Already have a profile? Point them at the role dropdown instead.
    const { data: existing } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "That user already exists — search for them above and change their role instead." },
        { status: 409 }
      );
    }

    // Create the auth user + send a Supabase invite email (sets up their login).
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kyndacoffee.com";
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/account`,
      data: fullName ? { full_name: fullName } : undefined,
    });

    if (inviteErr || !invited?.user) {
      console.error("Team invite error", inviteErr);
      return NextResponse.json(
        { error: `Could not invite: ${inviteErr?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }

    // The on_auth_user_created trigger creates the profile row; upsert to set
    // the role + name regardless of trigger timing.
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: invited.user.id,
        email,
        full_name: fullName || null,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (profileErr) {
      console.error("Team invite profile error", profileErr);
      return NextResponse.json(
        { error: "Invite sent, but setting the role failed — set it manually below." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, user_id: invited.user.id, email, role });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

/** PATCH — change an existing user's role. Owner only. */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized — owner only." }, { status: 401 });

  try {
    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const nextRole = body.role as RoleTier;

    if (!userId || !ASSIGNABLE.includes(nextRole)) {
      return NextResponse.json({ error: "user_id and a valid role are required." }, { status: 400 });
    }

    const { data: target, error: fetchErr } = await supabaseAdmin()
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (fetchErr || !target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Lockout guard: never let someone demote themselves.
    if (userId === team.user.id && !hasTier(nextRole, "owner")) {
      return NextResponse.json(
        { error: "You can't demote yourself from owner." },
        { status: 400 }
      );
    }

    const { error: updateErr } = await supabaseAdmin()
      .from("profiles")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) {
      console.error("Role update error", updateErr);
      return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user_id: userId, role: nextRole });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

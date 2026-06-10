import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRole, hasTier, type RoleTier } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const ASSIGNABLE: RoleTier[] = ["customer", "staff", "manager", "owner"];

/**
 * GET /api/admin/team — list team members + recent customers (manager+).
 * PATCH /api/admin/team — change a user's role.
 *   - manager can grant/revoke `staff` only
 *   - owner can grant/revoke any tier (incl. manager/owner)
 *   - nobody can demote themselves (lockout guard)
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

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const nextRole = body.role as RoleTier;

    if (!userId || !ASSIGNABLE.includes(nextRole)) {
      return NextResponse.json({ error: "user_id and a valid role are required." }, { status: 400 });
    }

    // Lockout guard: never let someone change their own tier.
    if (userId === team.user.id) {
      return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
    }

    const { data: target, error: fetchErr } = await supabaseAdmin()
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (fetchErr || !target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const targetRole = normalizeRole(target.role as string);

    if (team.role !== "owner") {
      // Managers can only move people between customer ↔ staff.
      const touchingElevated = hasTier(targetRole, "manager") || hasTier(nextRole, "manager");
      if (touchingElevated) {
        return NextResponse.json(
          { error: "Only an owner can assign or change Team Lead / Owner roles." },
          { status: 403 }
        );
      }
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

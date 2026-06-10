/**
 * Kynda role tiers — single source of truth for access levels.
 *
 * Three staff tiers (owner ask, 2026-06-10):
 *  - owner:   Jonathan + Briseida — everything (business metrics, accounting, settings)
 *  - manager: team leadership — day-to-day ops, scheduling, inventory pars, events
 *  - staff:   baristas/full team — KDS, schedule, waste log, recipes, training, chat
 *  - customer: everyone else (no portal access)
 *
 * The `profiles.role` column has accumulated legacy values across migrations
 * ('admin', 'employee', 'team', ...). `normalizeRole` maps every legacy value
 * onto the canonical tier so checks never depend on raw strings again.
 */

export type RoleTier = "owner" | "manager" | "staff" | "customer";

/** Ascending privilege order. */
const TIER_RANK: Record<RoleTier, number> = {
  customer: 0,
  staff: 1,
  manager: 2,
  owner: 3,
};

/** Map any raw profiles.role value (legacy included) to a canonical tier. */
export function normalizeRole(raw: string | null | undefined): RoleTier {
  const r = (raw ?? "").trim().toLowerCase();
  switch (r) {
    case "owner":
    case "admin": // legacy admin == full access
      return "owner";
    case "manager":
    case "lead":
    case "team_lead":
      return "manager";
    case "staff":
    case "employee":
    case "team":
    case "barista":
      return "staff";
    default:
      return "customer";
  }
}

/** True when `role` meets or exceeds `minTier`. */
export function hasTier(role: RoleTier, minTier: RoleTier): boolean {
  return TIER_RANK[role] >= TIER_RANK[minTier];
}

/** Convenience: is this role any kind of team member (staff or above)? */
export function isTeamMember(role: RoleTier): boolean {
  return hasTier(role, "staff");
}

/** Human label for each tier (UI badges, admin user management). */
export const TIER_LABELS: Record<RoleTier, string> = {
  owner: "Owner",
  manager: "Team Lead",
  staff: "Barista / Staff",
  customer: "Customer",
};

/** Routes each tier may enter. Used by middleware + nav rendering. */
export function minTierForPath(pathname: string): RoleTier | null {
  if (pathname.startsWith("/kds")) return "staff";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/training")) return "staff";
  if (pathname.startsWith("/admin")) return "manager"; // page-level gates tighten owner-only areas
  return null;
}

/** Owner-only admin sections (everything else in /admin is manager+). */
const OWNER_ONLY_ADMIN = [
  "/admin/settings",
  "/admin/data-export",
  "/admin/insights",
  "/admin/analytics",
  "/admin/accounting",
  "/admin/pricing",
];

export function isOwnerOnlyAdminPath(pathname: string): boolean {
  return OWNER_ONLY_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

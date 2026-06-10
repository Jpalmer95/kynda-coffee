"use client";

/**
 * /admin/team — Team & Access management (owner + team leads).
 *
 * Three access tiers per the owner's org design (2026-06-10):
 *   Owner      → everything incl. business metrics, accounting, settings
 *   Team Lead  → day-to-day ops: scheduling, inventory pars, events, KDS
 *   Staff      → KDS, schedule, waste log, recipes, training, handbook
 *
 * Managers can promote customers to Staff; only Owners can assign
 * Team Lead / Owner. Self-demotion is blocked server-side.
 */

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Search, Shield, Users } from "lucide-react";
import Link from "next/link";
import { TIER_LABELS, type RoleTier } from "@/lib/auth/roles";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  raw_role: string;
  role: RoleTier;
  created_at: string;
}

const TIER_BADGE: Record<RoleTier, string> = {
  owner: "bg-purple-100 text-purple-700",
  manager: "bg-amber-100 text-amber-700",
  staff: "bg-green-100 text-green-700",
  customer: "bg-latte/20 text-mocha",
};

export default function AdminTeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [viewerRole, setViewerRole] = useState<RoleTier>("manager");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/team${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load team");
      setMembers(data.members ?? []);
      setViewerRole(data.viewer_role ?? "manager");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  async function changeRole(userId: string, role: RoleTier) {
    setUpdatingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      await load(searched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  const assignable: RoleTier[] =
    viewerRole === "owner" ? ["customer", "staff", "manager", "owner"] : ["customer", "staff"];

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-mocha hover:text-espresso">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-sand">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-espresso">Team & Access</h1>
            <p className="text-sm text-mocha">
              Owner → everything · Team Lead → daily ops · Staff → KDS, schedule, logs, training
            </p>
          </div>
        </div>

        {/* Search (find a customer to promote to staff) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(query);
            load(query);
          }}
          className="mb-6 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any user by email or name to add them to the team..."
              className="w-full rounded-xl border border-latte/30 bg-background py-2.5 pl-9 pr-3 text-sm text-espresso placeholder:text-mocha/60 focus:border-forest focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-forest px-5 py-2.5 text-sm font-medium text-sand">
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading team...
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
            {searched ? "No users match that search." : "No team members yet — search for a user to promote."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-latte/20 bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Change role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-latte/10 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-espresso">{m.full_name || "—"}</div>
                      <div className="text-xs text-mocha">{m.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TIER_BADGE[m.role]}`}>
                        <Shield className="h-3 w-3" /> {TIER_LABELS[m.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value as RoleTier)}
                          disabled={
                            updatingId === m.id ||
                            (viewerRole !== "owner" && (m.role === "owner" || m.role === "manager"))
                          }
                          className="rounded-lg border border-latte/30 bg-background px-3 py-1.5 text-sm text-espresso disabled:opacity-50"
                        >
                          {/* Always render the current tier so the select shows truth even when not assignable by viewer */}
                          {Array.from(new Set([...assignable, m.role])).map((tier) => (
                            <option key={tier} value={tier}>
                              {TIER_LABELS[tier as RoleTier]}
                            </option>
                          ))}
                        </select>
                        {updatingId === m.id && <Loader2 className="h-4 w-4 animate-spin text-mocha" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-mocha">
          Team Leads can add/remove Staff. Only Owners can assign Team Lead or Owner. You cannot change your own role.
        </p>
      </div>
    </div>
  );
}

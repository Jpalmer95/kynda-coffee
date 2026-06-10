"use client";

/**
 * /admin/schedule — real team scheduling for leadership (replaces the
 * 2026-05 hardcoded mock). Create/publish shifts against actual team
 * members (profiles), review schedule requests. Staff see published
 * shifts at /staff/schedule.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, Loader2, Plus, Trash2, X } from "lucide-react";

interface Shift {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  station: string;
  notes: string | null;
  published: boolean;
  profiles?: { full_name: string | null; email: string } | null;
}

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface ScheduleRequest {
  id: string;
  user_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  status: string;
  profiles?: { full_name: string | null; email: string } | null;
}

const STATIONS = ["barista", "bar", "kitchen", "register", "baker", "lead", "event", "other"];

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - day);
  return out;
}
function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminSchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-shift form
  const [showAdd, setShowAdd] = useState(false);
  const [formUser, setFormUser] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formStation, setFormStation] = useState("barista");
  const [formPublish, setFormPublish] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, mRes, rRes] = await Promise.all([
        fetch(`/api/staff/schedule?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`, { cache: "no-store" }),
        fetch("/api/admin/team", { cache: "no-store" }),
        fetch("/api/staff/schedule-requests", { cache: "no-store" }),
      ]);
      const sData = await sRes.json();
      const mData = await mRes.json();
      const rData = await rRes.json();
      if (sRes.ok) setShifts(sData.shifts ?? []);
      if (mRes.ok) setMembers((mData.members ?? []).filter((m: Member & { role: string }) => m.role !== "customer"));
      if (rRes.ok) setRequests((rData.requests ?? []).filter((r: ScheduleRequest) => r.status === "pending"));
    } catch {
      setError("Failed to load schedule data.");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  async function createShift(e: React.FormEvent) {
    e.preventDefault();
    if (!formUser || !formStart || !formEnd) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: formUser,
          starts_at: new Date(formStart).toISOString(),
          ends_at: new Date(formEnd).toISOString(),
          station: formStation,
          published: formPublish,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create shift");
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shift");
    } finally {
      setSaving(false);
    }
  }

  async function patchShift(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    try {
      await fetch("/api/staff/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteShift(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/staff/schedule?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reviewRequest(id: string, status: "approved" | "denied") {
    setBusyId(id);
    try {
      await fetch("/api/staff/schedule-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openAddFor(day: Date) {
    const start = new Date(day);
    start.setHours(7, 0, 0, 0);
    const end = new Date(day);
    end.setHours(15, 0, 0, 0);
    setFormStart(toLocalInput(start));
    setFormEnd(toLocalInput(end));
    setShowAdd(true);
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading flex items-center gap-3 text-3xl font-bold">
            <Calendar className="h-8 w-8 text-forest" /> Staff Schedule
          </h1>
          <p className="text-sm text-mocha">
            Week of {weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} –{" "}
            {addDays(weekStart, 6).toLocaleDateString([], { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="rounded-lg border border-latte/30 px-3 py-1.5 text-sm hover:bg-latte/10">← Prev</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-lg border border-latte/30 px-3 py-1.5 text-sm hover:bg-latte/10">Today</button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="rounded-lg border border-latte/30 px-3 py-1.5 text-sm hover:bg-latte/10">Next →</button>
          <button onClick={() => openAddFor(weekStart)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Add Shift
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-800">
            Pending Schedule Requests ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/70 px-4 py-2.5 text-sm">
                <span className="font-medium text-espresso">{r.profiles?.full_name || r.profiles?.email}</span>
                <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs capitalize text-mocha">{r.kind.replace("_", " ")}</span>
                <span className="text-mocha">
                  {new Date(r.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })} →{" "}
                  {new Date(r.ends_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
                {r.reason && <span className="text-xs text-mocha/80">{r.reason}</span>}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => reviewRequest(r.id, "approved")} disabled={busyId === r.id} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => reviewRequest(r.id, "denied")} disabled={busyId === r.id} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                    <X className="h-3.5 w-3.5" /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading schedule...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-7">
          {days.map((day) => {
            const dayShifts = shifts.filter(
              (s) => new Date(s.starts_at).toDateString() === day.toDateString()
            );
            return (
              <div key={day.toISOString()} className="rounded-2xl border border-latte/20 bg-card p-4">
                <div className="mb-3 flex items-center justify-between text-sm font-medium text-espresso">
                  {day.toLocaleDateString([], { weekday: "short", day: "numeric" })}
                  <button onClick={() => openAddFor(day)} className="rounded bg-latte/10 px-2 py-0.5 text-xs hover:bg-latte/20">
                    + Shift
                  </button>
                </div>

                {dayShifts.length === 0 && <p className="text-xs text-mocha/60">No shifts</p>}

                {dayShifts.map((shift) => (
                  <div key={shift.id} className={`mb-2 rounded-lg border px-3 py-2 text-sm ${shift.published ? "bg-cream" : "border-dashed bg-background"}`}>
                    <div className="font-medium">{shift.profiles?.full_name || shift.profiles?.email?.split("@")[0] || "—"}</div>
                    <div className="font-mono text-xs text-mocha">
                      {fmtTime(shift.starts_at)} – {fmtTime(shift.ends_at)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-latte/20 px-2 py-0.5 text-[10px] capitalize text-mocha">{shift.station}</span>
                      {!shift.published && (
                        <button onClick={() => patchShift(shift.id, { published: true })} disabled={busyId === shift.id} className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-medium text-sand disabled:opacity-50">
                          Publish
                        </button>
                      )}
                      <button onClick={() => deleteShift(shift.id)} disabled={busyId === shift.id} className="ml-auto text-mocha/60 hover:text-red-600 disabled:opacity-50" aria-label="Delete shift">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Shift Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createShift} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6">
            <h3 className="font-semibold text-espresso">Add Shift</h3>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Team member</span>
              <select required value={formUser} onChange={(e) => setFormUser(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso">
                <option value="">Select...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Start</span>
                <input type="datetime-local" required value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">End</span>
                <input type="datetime-local" required value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Station</span>
              <select value={formStation} onChange={(e) => setFormStation(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 capitalize text-espresso">
                {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-espresso">
              <input type="checkbox" checked={formPublish} onChange={(e) => setFormPublish(e.target.checked)} />
              Publish immediately (visible to staff)
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-mocha">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

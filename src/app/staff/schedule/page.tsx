"use client";

/**
 * /staff/schedule — staff view their published shifts + submit schedule
 * requests (time off / swap / availability). Managers review requests at
 * /admin/schedule.
 */

import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, Loader2, Plus, Send } from "lucide-react";

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

interface ScheduleRequest {
  id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
}

const KIND_LABELS: Record<string, string> = {
  time_off: "Time Off",
  swap: "Shift Swap",
  availability: "Availability Change",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  cancelled: "bg-latte/20 text-mocha",
};

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function StaffSchedulePage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // request form
  const [kind, setKind] = useState("time_off");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch("/api/staff/schedule", { cache: "no-store" }),
        fetch("/api/staff/schedule-requests", { cache: "no-store" }),
      ]);
      const sData = await sRes.json();
      const rData = await rRes.json();
      if (sRes.ok) setShifts(sData.shifts ?? []);
      if (rRes.ok) setRequests(rData.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/schedule-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          starts_at: new Date(startDate).toISOString(),
          ends_at: new Date(endDate).toISOString(),
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  // Group shifts by day
  const byDay = shifts.reduce<Record<string, Shift[]>>((acc, s) => {
    const day = fmtDay(s.starts_at);
    (acc[day] = acc[day] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-7 w-7 text-forest" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-espresso">Schedule</h1>
              <p className="text-sm text-mocha">Next two weeks</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-medium text-sand"
          >
            <Plus className="h-4 w-4" /> Request
          </button>
        </div>

        {/* Request form */}
        {showForm && (
          <form onSubmit={submitRequest} className="space-y-4 rounded-2xl border border-latte/20 bg-card p-5">
            <h2 className="font-semibold text-espresso">New Schedule Request</h2>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Type</span>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso">
                  {Object.entries(KIND_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">From</span>
                <input type="datetime-local" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">To</span>
                <input type="datetime-local" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Reason (optional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. doctor appointment" className="w-full rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
            </label>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-medium text-sand disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Request
            </button>
          </form>
        )}

        {/* Shifts */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-mocha">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading schedule...
          </div>
        ) : Object.keys(byDay).length === 0 ? (
          <div className="rounded-2xl border border-latte/20 bg-card py-12 text-center text-mocha">
            No published shifts in the next two weeks yet.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byDay).map(([day, dayShifts]) => (
              <div key={day} className="rounded-2xl border border-latte/20 bg-card p-4">
                <div className="mb-3 font-semibold text-espresso">{day}</div>
                <div className="space-y-2">
                  {dayShifts.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-background px-4 py-3">
                      <Clock className="h-4 w-4 text-forest" />
                      <span className="font-medium text-espresso">
                        {fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}
                      </span>
                      <span className="rounded-full bg-latte/20 px-2.5 py-0.5 text-xs capitalize text-mocha">{s.station}</span>
                      <span className="text-sm text-mocha">{s.profiles?.full_name || s.profiles?.email || ""}</span>
                      {s.notes && <span className="text-xs text-mocha/70">— {s.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My requests */}
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-espresso">My Requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-mocha">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-latte/20 bg-card px-4 py-3 text-sm">
                  <span className="font-medium text-espresso">{KIND_LABELS[r.kind] ?? r.kind}</span>
                  <span className="text-mocha">
                    {fmtDay(r.starts_at)} → {fmtDay(r.ends_at)}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status] ?? ""}`}>{r.status}</span>
                  {r.reason && <span className="text-xs text-mocha/70">{r.reason}</span>}
                  {r.review_note && <span className="text-xs italic text-mocha/70">Lead: {r.review_note}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

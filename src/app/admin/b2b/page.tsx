"use client";

/**
 * /admin/b2b — Wholesale pipeline Kanban (replaces the 2026-05 hardcoded mock).
 *
 * Real columns over b2b_leads with the tested state machine: New → Approved →
 * Contacted → Negotiating → Won (or Lost/Rejected). The "Approve" move is the
 * owner gate — agents/scouts can only ever create 'new' leads, and the data
 * layer forbids skipping approval before outreach.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Loader2,
  MapPin,
  Plus,
  Star,
  X,
} from "lucide-react";
import { PIPELINE_STAGES, B2B_TRANSITIONS, type B2BLeadStatus } from "@/lib/b2b/leads";
import { formatPrice } from "@/lib/utils";

interface Lead {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  lead_type: string;
  source: string;
  status: B2BLeadStatus;
  fit_score: number | null;
  est_monthly_value_cents: number | null;
  notes: string | null;
  created_at: string;
}

const TYPE_EMOJI: Record<string, string> = {
  grocery: "🛒",
  cafe: "☕",
  office: "🏢",
  restaurant: "🍽",
  hotel: "🏨",
  event: "🎪",
  other: "📦",
};

const STAGE_TONE: Record<string, string> = {
  new: "border-amber-300/60",
  approved: "border-blue-300/60",
  contacted: "border-indigo-300/60",
  negotiating: "border-purple-300/60",
  won: "border-green-400/60",
  lost: "border-latte/30",
};

const MOVE_LABELS: Partial<Record<B2BLeadStatus, string>> = {
  approved: "Approve",
  contacted: "Mark Contacted",
  negotiating: "Negotiating",
  won: "Won 🎉",
  lost: "Lost",
  rejected: "Reject",
};

export default function AdminB2BPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add-lead form
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    email: "",
    phone: "",
    location: "",
    lead_type: "cafe",
    est_monthly: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/b2b", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pipeline");
      setLeads(data.leads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveLead(id: string, status: B2BLeadStatus) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/b2b", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Move failed");
      setLeads((prev) => prev.map((l) => (l.id === id ? data.lead : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setBusyId(null);
    }
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/b2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          lead_type: form.lead_type,
          est_monthly_value_cents: form.est_monthly ? Math.round(Number(form.est_monthly) * 100) : undefined,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add lead");
      setShowAdd(false);
      setForm({ company: "", contact_name: "", email: "", phone: "", location: "", lead_type: "cafe", est_monthly: "", notes: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setSaving(false);
    }
  }

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of PIPELINE_STAGES) map[stage.key] = [];
    for (const lead of leads) {
      if (lead.status === "rejected") continue; // hidden column; reachable via Reject action
      (map[lead.status] ??= []).push(lead);
    }
    return map;
  }, [leads]);

  const pipelineValue = useMemo(
    () =>
      leads
        .filter((l) => ["approved", "contacted", "negotiating"].includes(l.status))
        .reduce((s, l) => s + (l.est_monthly_value_cents ?? 0), 0),
    [leads]
  );
  const wonValue = useMemo(
    () => leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.est_monthly_value_cents ?? 0), 0),
    [leads]
  );

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading flex items-center gap-3 text-3xl font-bold">
            <Briefcase className="h-8 w-8 text-forest" /> Wholesale Pipeline
          </h1>
          <p className="text-sm text-mocha">
            Grocery, café & bulk accounts · {formatPrice(pipelineValue)}/mo in active pipeline · {formatPrice(wonValue)}/mo won
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary ml-auto flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Lead
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className={`rounded-2xl border-t-4 ${STAGE_TONE[stage.key]} border border-latte/20 bg-card p-3`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-bold uppercase tracking-wide text-espresso">{stage.label}</span>
                <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs text-mocha">{byStage[stage.key]?.length ?? 0}</span>
              </div>

              <div className="space-y-2.5">
                {(byStage[stage.key] ?? []).map((lead) => (
                  <div key={lead.id} className="rounded-xl border border-latte/20 bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-espresso">
                        {TYPE_EMOJI[lead.lead_type] ?? "📦"} {lead.company}
                      </div>
                      {lead.fit_score != null && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-bold text-forest" title="Fit score">
                          <Star className="h-3 w-3" /> {lead.fit_score}
                        </span>
                      )}
                    </div>
                    {lead.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-mocha">
                        <MapPin className="h-3 w-3" /> {lead.location}
                      </div>
                    )}
                    {lead.est_monthly_value_cents != null && lead.est_monthly_value_cents > 0 && (
                      <div className="mt-1 text-xs font-semibold text-forest">{formatPrice(lead.est_monthly_value_cents)}/mo est.</div>
                    )}
                    {(lead.contact_name || lead.email) && (
                      <div className="mt-1 truncate text-xs text-mocha">{lead.contact_name || lead.email}</div>
                    )}
                    {lead.notes && <div className="mt-1 line-clamp-2 text-xs text-mocha/80">{lead.notes}</div>}
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-mocha/60">via {lead.source}</div>

                    {/* Moves allowed by the state machine */}
                    {B2B_TRANSITIONS[lead.status]?.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-latte/15 pt-2.5">
                        {B2B_TRANSITIONS[lead.status].map((next) => (
                          <button
                            key={next}
                            onClick={() => moveLead(lead.id, next)}
                            disabled={busyId === lead.id}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
                              next === "won"
                                ? "bg-green-600 text-white"
                                : next === "lost" || next === "rejected"
                                ? "border border-latte/30 text-mocha hover:text-red-600"
                                : "bg-forest text-sand"
                            }`}
                          >
                            {busyId === lead.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : next === "lost" || next === "rejected" ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <ArrowRight className="h-3 w-3" />
                            )}
                            {MOVE_LABELS[next] ?? next}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(byStage[stage.key] ?? []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-latte/30 py-6 text-center text-xs text-mocha/60">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-mocha">
        Inbound leads from <Link href="/wholesale" className="underline">kyndacoffee.com/wholesale</Link> land in New automatically.
        Agent scouts can only ever add to New — outreach requires your Approve. Fit score weighs channel type, recurring value, and Hill Country locality.
      </p>

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createLead} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-card p-6">
            <h3 className="font-semibold text-espresso">Add Wholesale Lead</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company *" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso sm:col-span-2" />
              <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Contact name" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              <select value={form.lead_type} onChange={(e) => setForm({ ...form, lead_type: e.target.value })} className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm capitalize text-espresso">
                {Object.keys(TYPE_EMOJI).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location (e.g. Marble Falls, TX)" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              <input value={form.est_monthly} onChange={(e) => setForm({ ...form, est_monthly: e.target.value })} placeholder="Est. $/month" type="number" min="0" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso sm:col-span-2" rows={3} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving || !form.company.trim()} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Lead
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-mocha">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

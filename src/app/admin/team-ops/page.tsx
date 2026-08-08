"use client";

/**
 * /admin/team-ops — manage onboarding documents, handbook sections,
 * and view per-hire onboarding progress.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, FileText,
  Loader2, Pencil, Plus, Save, Trash2, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingDoc {
  id: string;
  title: string;
  description: string | null;
  category: string;
  external_url: string | null;
  storage_path: string | null;
  file_type: string | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

interface OnboardingProgress {
  id: string;
  task_key: string;
  task_label: string;
  status: string;
  hire_email: string;
  hire_name: string | null;
  notes: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface HandbookSection {
  id: string;
  title: string;
  content: string[];
  order_index: number;
}

export default function AdminTeamOpsPage() {
  const [tab, setTab] = useState<"onboarding" | "handbook" | "progress">("onboarding");
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [progress, setProgress] = useState<OnboardingProgress[]>([]);
  const [sections, setSections] = useState<HandbookSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [onbRes, handRes] = await Promise.all([
        fetch("/api/admin/onboarding", { cache: "no-store" }),
        fetch("/api/admin/handbook", { cache: "no-store" }),
      ]);
      const onbData = await onbRes.json();
      const handData = await handRes.json();
      if (onbRes.ok) { setDocs(onbData.documents ?? []); setProgress(onbData.progress ?? []); }
      if (handRes.ok) setSections(handData.sections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group progress by hire email
  const progressByHire = progress.reduce<Record<string, OnboardingProgress[]>>((acc, p) => {
    const key = p.hire_email;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Users className="h-7 w-7 text-forest" /> Team Operations
          </h1>
          <p className="text-sm text-mocha">Onboarding documents, handbook, and hire progress</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {[
          { key: "onboarding" as const, label: "Onboarding Docs", icon: FileText },
          { key: "handbook" as const, label: "Handbook", icon: BookOpen },
          { key: "progress" as const, label: "Hire Progress", icon: CheckCircle2 },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium", tab === t.key ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : tab === "onboarding" ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Document
            </button>
          </div>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-xl border border-latte/20 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-espresso">{doc.title}</h3>
                    {doc.is_required && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Required</span>}
                    {!doc.is_active && <span className="text-xs text-mocha">Inactive</span>}
                  </div>
                  <p className="text-xs text-mocha">{doc.category} · {doc.file_type ?? "link"} · {doc.external_url ?? doc.storage_path ?? "No source"}</p>
                  {doc.description && <p className="mt-1 text-sm text-mocha">{doc.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => { setEditing(doc); setShowForm(true); }} className="rounded-lg p-1.5 text-mocha hover:bg-latte/20"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/admin/onboarding?id=${doc.id}`, { method: "DELETE" }); load(); } }} className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {docs.length === 0 && <p className="py-8 text-center text-sm text-mocha">No documents yet.</p>}
          </div>
        </div>
      ) : tab === "handbook" ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Section
            </button>
          </div>
          <div className="space-y-2">
            {sections.map((s) => (
              <div key={s.id} className="rounded-xl border border-latte/20 bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-espresso">{s.title}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(s); setShowForm(true); }} className="rounded-lg p-1.5 text-mocha hover:bg-latte/20"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/admin/handbook?id=${s.id}`, { method: "DELETE" }); load(); } }} className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-mocha">{s.content?.length ?? 0} paragraphs · order {s.order_index}</p>
              </div>
            ))}
            {sections.length === 0 && <p className="py-8 text-center text-sm text-mocha">No handbook sections yet.</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(progressByHire).map(([email, tasks]) => {
            const completed = tasks.filter((t) => t.status === "complete").length;
            const total = tasks.length;
            return (
              <div key={email} className="rounded-2xl border border-latte/20 bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-espresso">{tasks[0].hire_name || email}</h3>
                    <p className="text-xs text-mocha">{email}</p>
                  </div>
                  <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">{completed}/{total} done</span>
                </div>
                <div className="space-y-1.5">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg bg-latte/5 px-3 py-2 text-sm">
                      {t.status === "complete" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-forest" />
                      : t.status === "in_progress" ? <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                      : <Circle className="h-4 w-4 shrink-0 text-mocha/40" />}
                      <span className={t.status === "complete" ? "text-mocha line-through" : "text-espresso"}>{t.task_label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(progressByHire).length === 0 && (
            <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
              No onboarding tasks assigned yet.
            </div>
          )}
        </div>
      )}

      {/* Edit/Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            const isHandbook = tab === "handbook" || editing?.content;
            const endpoint = isHandbook ? "/api/admin/handbook" : "/api/admin/onboarding";
            const method = editing ? "PATCH" : "POST";
            const payload = editing ? { id: editing.id, ...editing } : editing;
            try {
              const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
              if (!res.ok) throw new Error("Save failed");
              setShowForm(false);
              await load();
            } catch { setError("Save failed"); } finally { setSaving(false); }
          }} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-espresso">{editing ? "Edit" : "New"} {tab === "handbook" ? "Section" : "Document"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1 text-mocha hover:bg-latte/20"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-espresso">
                Title *
                <input required value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input-field mt-1" />
              </label>
              {tab !== "handbook" && (
                <>
                  <label className="block text-sm font-medium text-espresso">
                    Description
                    <input value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="input-field mt-1" />
                  </label>
                  <label className="block text-sm font-medium text-espresso">
                    External URL
                    <input value={editing?.external_url ?? ""} onChange={(e) => setEditing({ ...editing, external_url: e.target.value })} className="input-field mt-1" placeholder="https://..." />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-espresso">
                    <input type="checkbox" checked={editing?.is_required ?? false} onChange={(e) => setEditing({ ...editing, is_required: e.target.checked })} className="h-4 w-4 rounded border-latte/40" />
                    Required
                  </label>
                </>
              )}
              {tab === "handbook" && (
                <label className="block text-sm font-medium text-espresso">
                  Content (one paragraph per line)
                  <textarea value={(editing?.content ?? []).join("\n")} onChange={(e) => setEditing({ ...editing, content: e.target.value.split("\n").filter(Boolean) })} className="input-field mt-1 min-h-32 text-sm" />
                </label>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

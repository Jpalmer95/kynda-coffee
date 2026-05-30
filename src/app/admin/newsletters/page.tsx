"use client";

// /admin/newsletters — Newsletter automation. Generate a draft from current
// specials, edit, approve (optionally schedule), and send. Approved newsletters
// are also auto-sent by the send-due cron.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, Sparkles, Save, Send, CheckCircle, XCircle, Trash2, Users, Eye } from "lucide-react";

interface Newsletter {
  id: string;
  subject: string;
  preheader: string | null;
  body_html: string;
  status: string;
  source: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

type Draft = { id?: string; subject: string; preheader: string; body_html: string };

export default function AdminNewslettersPage() {
  const [items, setItems] = useState<Newsletter[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/newsletters", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.newsletters ?? []);
      setSubscriberCount(data.subscriberCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/newsletters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || data.error || "Request failed");
    return data;
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { draft } = await post({ action: "generate" });
      setEditing({ subject: draft.subject, preheader: draft.preheader, body_html: draft.bodyHtml });
      setPreview(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await post({ action: "save", ...editing });
      setEditing(null);
      setNotice("Saved as draft.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function approve(n: Newsletter) {
    const when = window.prompt("Schedule send time (ISO, blank = send on next cron run):", "");
    setBusy(true);
    try {
      await post({ action: "approve", id: n.id, scheduled_at: when?.trim() || undefined });
      setNotice("Approved. It will send on the next cron run (or at the scheduled time).");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(n: Newsletter) {
    if (!confirm(`Send "${n.subject}" to ${subscriberCount} subscriber(s) now?`)) return;
    setBusy(true);
    try {
      const { result } = await post({ action: "send", id: n.id });
      setNotice(`Sent: ${result.sent} delivered, ${result.failed} failed.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject(n: Newsletter) {
    const reason = window.prompt("Reason (optional):") ?? undefined;
    setBusy(true);
    try {
      await post({ action: "reject", id: n.id, reason });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this newsletter?")) return;
    await fetch(`/api/admin/newsletters?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/marketing" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Mail className="h-7 w-7 text-forest" /> Newsletters
          </h1>
          <p className="flex items-center gap-1 text-sm text-mocha">
            <Users className="h-4 w-4" /> {subscriberCount} active subscriber{subscriberCount === 1 ? "" : "s"}
          </p>
        </div>
        <button onClick={generate} disabled={busy} className="btn-secondary text-sm disabled:opacity-60">
          <Sparkles className="mr-1.5 inline h-4 w-4" /> Generate from specials
        </button>
        <button onClick={() => setEditing({ subject: "", preheader: "", body_html: "" })} className="btn-primary text-sm">
          New
        </button>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-2xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage">{notice}</div>}

      {editing && (
        <div className="mb-8 rounded-2xl border border-forest/30 bg-card p-6">
          <h2 className="mb-4 font-heading text-xl font-bold text-espresso">{editing.id ? "Edit" : "New"} Newsletter</h2>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-espresso">
              Subject *
              <input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-espresso">
              Preheader (inbox preview)
              <input value={editing.preheader} onChange={(e) => setEditing({ ...editing, preheader: e.target.value })} className="input-field mt-1" />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-espresso">Body (HTML)</span>
              <button onClick={() => setPreview((p) => !p)} className="text-sm text-forest hover:underline">
                <Eye className="mr-1 inline h-4 w-4" /> {preview ? "Edit HTML" : "Preview"}
              </button>
            </div>
            {preview ? (
              <iframe title="preview" srcDoc={editing.body_html} className="h-[600px] w-full rounded-xl border border-latte/30 bg-white" />
            ) : (
              <textarea value={editing.body_html} onChange={(e) => setEditing({ ...editing, body_html: e.target.value })} className="input-field min-h-[300px] font-mono text-xs" />
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary text-sm disabled:opacity-60">
              {busy ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Save className="mr-1.5 inline h-4 w-4" />} Save draft
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
          No newsletters yet. &ldquo;Generate from specials&rdquo; to draft one in seconds.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-latte/20 bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-lg font-bold text-espresso">{n.subject}</h3>
                  <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs capitalize text-mocha">{n.status}</span>
                  {n.source !== "manual" && <span className="rounded-full bg-forest/15 px-2 py-0.5 text-xs text-forest">{n.source}</span>}
                </div>
                {n.preheader && <p className="text-sm text-mocha">{n.preheader}</p>}
                <p className="mt-0.5 text-xs text-mocha">
                  {n.status === "sent"
                    ? `Sent ${n.sent_at ? new Date(n.sent_at).toLocaleString() : ""} · ${n.sent_count}/${n.recipients_count} delivered${n.failed_count ? `, ${n.failed_count} failed` : ""}`
                    : n.scheduled_at
                    ? `Scheduled ${new Date(n.scheduled_at).toLocaleString()}`
                    : `Created ${new Date(n.created_at).toLocaleDateString()}`}
                </p>
              </div>
              {["draft", "pending_approval", "rejected"].includes(n.status) && (
                <>
                  <button onClick={() => setEditing({ id: n.id, subject: n.subject, preheader: n.preheader ?? "", body_html: n.body_html })} className="btn-secondary text-sm">Edit</button>
                  <button onClick={() => approve(n)} disabled={busy} className="btn-primary text-sm disabled:opacity-60">
                    <CheckCircle className="mr-1.5 inline h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => reject(n)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Reject"><XCircle className="h-5 w-5" /></button>
                </>
              )}
              {n.status === "approved" && (
                <button onClick={() => sendNow(n)} disabled={busy} className="btn-primary text-sm disabled:opacity-60">
                  <Send className="mr-1.5 inline h-4 w-4" /> Send now
                </button>
              )}
              {n.status !== "sent" && n.status !== "sending" && (
                <button onClick={() => remove(n.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="h-5 w-5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

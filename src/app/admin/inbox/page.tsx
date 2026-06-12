"use client";

// /admin/inbox — Contact form submissions: read, triage, reply (mailto), archive.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox, Loader2, RefreshCw, Mail, Archive, Trash2, CheckCircle, Reply } from "lucide-react";

interface Submission {
  id: string;
  name: string;
  email: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
  source_table?: "contact_submissions" | "catering_requests";
}

const FILTERS = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Replied" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];

const STATUS_CLS: Record<string, string> = {
  new: "bg-rust/15 text-rust",
  read: "bg-latte/20 text-mocha",
  replied: "bg-sage/20 text-sage",
  archived: "bg-latte/15 text-mocha",
};

export default function AdminInboxPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inbox?status=${filter}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.submissions ?? []);
      setUnread(data.unread ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string, sourceTable?: string) {
    await fetch("/api/admin/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, source_table: sourceTable }),
    });
    await load();
  }

  async function remove(id: string, sourceTable?: string) {
    if (!confirm("Delete this message?")) return;
    const tableParam = sourceTable === "catering_requests" ? "&table=catering_requests" : "";
    await fetch(`/api/admin/inbox?id=${id}${tableParam}`, { method: "DELETE" });
    await load();
  }

  function reply(s: Submission) {
    // Mark replied, then open the mail client.
    setStatus(s.id, "replied", s.source_table);
    const subject = encodeURIComponent(`Re: your message to Kynda Coffee`);
    const body = encodeURIComponent(`Hi ${s.name},\n\n\n\n— Kynda Coffee`);
    window.location.href = `mailto:${s.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to admin">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Inbox className="h-7 w-7 text-forest" /> Inbox
            {unread > 0 && <span className="rounded-full bg-rust px-2.5 py-0.5 text-sm font-semibold text-white">{unread}</span>}
          </h1>
          <p className="text-sm text-mocha">Messages from your contact form. New ones also email you directly.</p>
        </div>
        <button onClick={load} className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Refresh">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === f.key ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
          {filter === "new" ? "No new messages. 📭" : "No messages in this view."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-latte/20 bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-heading text-lg font-bold text-espresso">{s.name}</span>
                <a href={`mailto:${s.email}`} className="text-sm text-forest hover:underline">{s.email}</a>
                <span className="rounded-full bg-espresso/10 px-2 py-0.5 text-xs capitalize text-espresso">{s.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[s.status] ?? "bg-latte/20 text-mocha"}`}>{s.status}</span>
                <span className="ml-auto text-xs text-mocha">{new Date(s.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-espresso">{s.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => reply(s)} className="btn-primary text-sm">
                  <Reply className="mr-1.5 inline h-4 w-4" /> Reply
                </button>
                {s.status === "new" && (
                  <button onClick={() => setStatus(s.id, "read", s.source_table)} className="btn-secondary text-sm">
                    <CheckCircle className="mr-1.5 inline h-4 w-4" /> Mark read
                  </button>
                )}
                {s.status !== "archived" && (
                  <button onClick={() => setStatus(s.id, "archived", s.source_table)} className="btn-secondary text-sm">
                    <Archive className="mr-1.5 inline h-4 w-4" /> Archive
                  </button>
                )}
                <button onClick={() => remove(s.id, s.source_table)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Delete">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

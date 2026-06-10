"use client";

/**
 * /staff/chat — shared team chat. Realtime via Supabase `team_messages`
 * publication (migration 028) with a polling fallback. Writes go through
 * /api/staff/chat (validates tier + rate limit).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function TeamChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/chat", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages ?? []);
        setMe(data.me ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Realtime: reload on inserts; 30s polling fallback.
    const supabase = createClient();
    const channel = supabase
      .channel("team-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, () => {
        load();
      })
      .subscribe();
    const poll = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-forest" />
          <div>
            <h1 className="font-heading text-xl font-bold text-espresso">Team Chat</h1>
            <p className="text-xs text-mocha">Everyone on the Kynda team can see this.</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-latte/20 bg-card p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-mocha">No messages yet — say hi! ☕</p>
          ) : (
            messages.map((m) => {
              const mine = m.user_id === me;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "bg-forest text-sand" : "bg-background text-espresso"}`}>
                    {!mine && (
                      <div className="mb-0.5 text-xs font-semibold text-forest">
                        {m.profiles?.full_name || m.profiles?.email?.split("@")[0] || "Teammate"}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words text-sm">{m.body}</div>
                    <div className={`mt-1 text-[10px] ${mine ? "text-sand/70" : "text-mocha/70"}`}>{fmtTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

        <form onSubmit={send} className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Message the team..."
            className="flex-1 rounded-xl border border-latte/30 bg-background px-4 py-3 text-sm text-espresso placeholder:text-mocha/60 focus:border-forest focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-medium text-sand disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

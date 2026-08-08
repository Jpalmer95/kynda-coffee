"use client";

/**
 * /staff/chat — shared team chat. Realtime via Supabase `team_messages`
 * publication (migration 028) with a polling fallback. Writes go through
 * /api/staff/chat (validates tier + rate limit).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, MessageCircle, Send, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  image_url: string | null;
  video_url: string | null;
  media_type: string | null;
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
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/chat", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages ?? []);
        setMe(data.me ?? null);
        setError(null);
      } else {
        setError(data.error || "Failed to load chat");
      }
    } catch {
      setError("Could not load chat — check your connection.");
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

  async function handleFileUpload(file: File, expectedType: "image" | "video") {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPendingMedia({ url: data.url, type: data.media_type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text && !pendingMedia) return;
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { body: text || null };
      if (pendingMedia?.type === "image") body.image_url = pendingMedia.url;
      if (pendingMedia?.type === "video") body.video_url = pendingMedia.url;
      if (pendingMedia) body.media_type = pendingMedia.type;

      const res = await fetch("/api/staff/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setDraft("");
      setPendingMedia(null);
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
                    {m.image_url && (
                      <img src={m.image_url} alt="" className="mt-2 max-h-48 rounded-lg" />
                    )}
                    {m.video_url && (
                      <video src={m.video_url} controls className="mt-2 max-h-48 rounded-lg" />
                    )}
                    <div className={`mt-1 text-[10px] ${mine ? "text-sand/70" : "text-mocha/70"}`}>{fmtTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

        {/* Pending media preview */}
        {pendingMedia && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-forest/30 bg-forest/5 px-3 py-2">
            {pendingMedia.type === "image" ? (
              <img src={pendingMedia.url} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <video src={pendingMedia.url} className="h-10 w-10 rounded object-cover" />
            )}
            <span className="text-xs text-mocha">{pendingMedia.type} ready</span>
            <button type="button" onClick={() => setPendingMedia(null)} className="ml-auto text-xs text-mocha hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {uploading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-mocha">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
          </div>
        )}

        <form onSubmit={send} className="mt-3 flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "image"); e.target.value = ""; }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "video"); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading || sending}
            className="shrink-0 rounded-xl border border-latte/30 p-3 text-mocha hover:border-forest/40 hover:text-forest disabled:opacity-50"
            title="Attach image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading || sending}
            className="shrink-0 rounded-xl border border-latte/30 p-3 text-mocha hover:border-forest/40 hover:text-forest disabled:opacity-50"
            title="Attach video"
          >
            <Video className="h-4 w-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Message the team..."
            className="flex-1 rounded-xl border border-latte/30 bg-background px-4 py-3 text-sm text-espresso placeholder:text-mocha/60 focus:border-forest focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || (!draft.trim() && !pendingMedia)}
            className="flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-medium text-sand disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

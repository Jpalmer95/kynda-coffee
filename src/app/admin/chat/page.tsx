"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Hash, Loader2, Pin, Send, Users } from "lucide-react";

type Channel = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  type: string;
  unread_count: number;
};

type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  body: string | null;
  image_url: string | null;
  pinned: boolean;
  created_at: string;
  authorName: string;
  authorRole: string;
};

const ROLE_COLORS: Record<string, string> = {
  owner: "text-bronze",
  manager: "text-forest",
  staff: "text-mocha",
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function TeamChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChannels = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/chat", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load channels");
      setChannels(data.channels ?? []);
      if (data.channels?.length > 0 && !activeChannel) {
        setActiveChannel(data.channels[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels");
    } finally {
      setLoadingChannels(false);
    }
  }, [activeChannel]);

  const loadMessages = useCallback(async () => {
    if (!activeChannel) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/chat?channel=${activeChannel}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load messages");
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [activeChannel]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!activeChannel) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChannel, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !activeChannel) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: activeChannel, body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      await loadMessages();
      await loadChannels(); // refresh unread counts
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setInput(text); // restore input on failure
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/admin/chat?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const activeChannelData = channels.find((c) => c.id === activeChannel);
  const pinnedMessages = messages.filter((m) => m.pinned);
  const regularMessages = messages.filter((m) => !m.pinned);

  return (
    <div className="flex h-[calc(100vh-69px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-latte/20 bg-card px-4 py-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 font-heading text-xl font-bold text-espresso">
          <Users className="h-6 w-6 text-forest" /> Team Chat
        </h1>
      </div>

      {error && <div className="bg-bronze/10 px-4 py-2 text-sm text-espresso">{error}</div>}

      <div className="flex flex-1 overflow-hidden">
        {/* Channel sidebar */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-latte/20 bg-card p-2">
          {loadingChannels ? (
            <div className="flex items-center justify-center py-8 text-mocha">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <nav className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeChannel === ch.id
                      ? "bg-forest/10 text-forest"
                      : "text-espresso hover:bg-latte/10"
                  }`}
                >
                  <span className="text-base">{ch.icon}</span>
                  <span className="flex-1 truncate font-medium">{ch.name}</span>
                  {ch.unread_count > 0 && (
                    <span className="rounded-full bg-forest px-1.5 py-0.5 text-xs font-bold text-white">
                      {ch.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}
        </aside>

        {/* Message area */}
        <div className="flex flex-1 flex-col">
          {/* Channel header */}
          {activeChannelData && (
            <div className="flex items-center gap-2 border-b border-latte/20 bg-card px-4 py-2">
              <Hash className="h-4 w-4 text-mocha" />
              <span className="font-heading font-bold text-espresso">{activeChannelData.name}</span>
              {activeChannelData.description && (
                <span className="text-xs text-mocha">— {activeChannelData.description}</span>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8 text-mocha">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-mocha">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pinned messages */}
                {pinnedMessages.length > 0 && (
                  <div className="mb-4 space-y-1 rounded-lg border border-bronze/20 bg-bronze/5 p-2">
                    {pinnedMessages.map((msg) => (
                      <div key={msg.id} className="flex items-center gap-2 text-sm text-espresso">
                        <Pin className="h-3 w-3 text-bronze" />
                        <span className="font-medium">{msg.authorName}:</span>
                        <span>{msg.body || "[image]"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Regular messages */}
                {regularMessages.map((msg, idx) => {
                  const prev = regularMessages[idx - 1];
                  const showAuthor = !prev || prev.user_id !== msg.user_id ||
                    new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
                  return (
                    <div key={msg.id} className="group flex gap-3">
                      {showAuthor ? (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest/15 text-xs font-bold text-forest">
                          {msg.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        {showAuthor && (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${ROLE_COLORS[msg.authorRole] ?? "text-espresso"}`}>
                              {msg.authorName}
                            </span>
                            <span className="text-xs text-mocha">{timeLabel(msg.created_at)}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          {msg.body && <p className="text-sm text-espresso break-words">{msg.body}</p>}
                          {msg.image_url && (
                            <img src={msg.image_url} alt="" className="max-h-48 rounded-lg border border-latte/20" />
                          )}
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="ml-auto shrink-0 text-xs text-mocha opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-latte/20 bg-card p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message #${activeChannelData?.name ?? ""}...`}
                className="input-field flex-1"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="btn-primary shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

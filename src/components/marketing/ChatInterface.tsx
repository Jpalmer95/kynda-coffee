"use client";

// Main marketing AI chat interface
// Manages conversation state, API calls, quick actions, and conversation history sidebar.

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, Trash2, MessageSquare, Sparkles, Instagram, Twitter, Facebook, Calendar } from "lucide-react";
import ChatMessage, { MessageData } from "./ChatMessage";
import { cn } from "@/lib/utils";

// ─── localStorage key for conversation history ───────────────────────────────
const STORAGE_KEY = "kynda_marketing_conversations";

interface Conversation {
  id: string;
  title: string;
  messages: MessageData[];
  created_at: string;
}

// ─── Quick action templates ──────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "Instagram post",
    icon: Instagram,
    prompt: "Write an Instagram post about ",
    placeholder: "e.g. our new seasonal latte",
  },
  {
    label: "Twitter/X thread",
    icon: Twitter,
    prompt: "Write a Twitter thread (3-5 tweets) about ",
    placeholder: "e.g. our weekend brunch menu",
  },
  {
    label: "Facebook event",
    icon: Facebook,
    prompt: "Create a Facebook event announcement for ",
    placeholder: "e.g. live music this Saturday",
  },
  {
    label: "Weekly content plan",
    icon: Calendar,
    prompt:
      "Plan a week of social media content starting next Monday. Focus on: ",
    placeholder: "e.g. new menu items, staff spotlights",
  },
];

export default function ChatInterface() {
  // ─── State ───────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Active conversation messages
  const activeConv = conversations.find((c) => c.id === activeId);
  const messages = activeConv?.messages || [];

  // ─── Load conversations from localStorage on mount ───────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Conversation[] = JSON.parse(stored);
        // Deserialize dates
        parsed.forEach((c) =>
          c.messages.forEach((m) => {
            m.timestamp = new Date(m.timestamp);
          })
        );
        setConversations(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      }
    } catch {
      // ignore malformed stored data
    }
  }, []);

  // ─── Save conversations to localStorage on change ────────────────────
  useEffect(() => {
    if (conversations.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch {
        // quota exceeded — ignore
      }
    }
  }, [conversations]);

  // ─── Auto-scroll to bottom on new messages ───────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Create a new conversation ───────────────────────────────────────
  function newConversation() {
    const id = crypto.randomUUID();
    const conv: Conversation = {
      id,
      title: "New conversation",
      messages: [],
      created_at: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setInput("");
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  // ─── Delete a conversation ───────────────────────────────────────────
  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
    // Clear localStorage if all gone
    if (conversations.length <= 1) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // ─── Send a message ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text || input).trim();
      if (!content || sending) return;

      // Ensure active conversation exists
      let currentId = activeId;
      if (!currentId) {
        currentId = crypto.randomUUID();
        const conv: Conversation = {
          id: currentId,
          title: content.slice(0, 50),
          messages: [],
          created_at: new Date().toISOString(),
        };
        setConversations((prev) => [conv, ...prev]);
        setActiveId(currentId);
      }

      // Add user message
      const userMsg: MessageData = {
        id: crypto.randomUUID(),
        role: "user",
        text: content,
        timestamp: new Date(),
      };

      // Add loading placeholder
      const loadingMsg: MessageData = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "",
        timestamp: new Date(),
        loading: true,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentId) return c;
          const updated = {
            ...c,
            messages: [...c.messages, userMsg, loadingMsg],
            // Update title from first user message if it's still default
            title:
              c.title === "New conversation"
                ? content.slice(0, 50)
                : c.title,
          };
          return updated;
        })
      );

      setInput("");
      setSending(true);

      try {
        // Build API messages (exclude loading placeholder)
        const apiMessages = [
          ...(activeConv?.messages || []).filter((m) => !m.loading),
          userMsg,
        ].map((m) => ({
          role: m.role,
          content: m.text,
        }));

        const res = await fetch("/api/marketing/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to get response");
        }

        // Extract text from response content blocks
        const responseText =
          data.content
            ?.filter((b: { type: string }) => b.type === "text")
            .map((b: { text: string }) => b.text)
            .join("\n\n") || "I couldn't generate a response. Please try again.";

        const assistantMsg: MessageData = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: responseText,
          timestamp: new Date(),
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentId) return c;
            // Remove loading message, add real response
            return {
              ...c,
              messages: [
                ...c.messages.filter((m) => !m.loading),
                assistantMsg,
              ],
            };
          })
        );
      } catch (error) {
        const errorMsg: MessageData = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `⚠️ ${error instanceof Error ? error.message : "Something went wrong. Please try again."}`,
          timestamp: new Date(),
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentId) return c;
            return {
              ...c,
              messages: [...c.messages.filter((m) => !m.loading), errorMsg],
            };
          })
        );
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [input, sending, activeId, activeConv]
  );

  // ─── Handle keyboard (Enter to send, Shift+Enter for newline) ───────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar — conversation history */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border/40 bg-muted/30 transition-all duration-200 overflow-y-auto",
          "w-64",
          sidebarOpen ? "max-md:w-64" : "max-md:w-0 max-md:border-r-0"
        )}
      >
        <div className="p-3">
          <button
            onClick={newConversation}
            className="w-full flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground hover:bg-accent/10 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        </div>

        <div className="px-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setActiveId(conv.id);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-center gap-2",
                conv.id === activeId
                  ? "bg-forest/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate flex-1">{conv.title}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No conversations yet.
              <br />
              Start one below!
            </p>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3 bg-card/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted/50"
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </button>
          <Sparkles className="h-5 w-5 text-forest" />
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Marketing AI
            </h2>
            <p className="text-xs text-muted-foreground">
              Social media posts, hashtags, scheduling & content planning
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Empty state — show quick actions
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-forest/10 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-forest" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                Marketing AI Assistant
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                I help Kynda Coffee create social content — Instagram posts, Twitter threads,
                weekly calendars, hashtags, and more. Try a quick action below or ask me anything.
              </p>

              {/* Quick action grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.prompt + action.placeholder);
                      inputRef.current?.focus();
                    }}
                    className="text-left p-4 rounded-xl border border-border/40 bg-card hover:bg-accent/5 hover:border-forest/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <action.icon className="h-4 w-4 text-forest group-hover:text-forest" />
                      <span className="text-sm font-medium text-foreground">
                        {action.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {action.prompt}
                      <span className="italic">{action.placeholder}</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-1">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border/40 bg-card/30 p-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to write a post, suggest hashtags, plan content…"
                rows={1}
                className="w-full resize-none rounded-xl border border-border/50 bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/50 transition-all min-h-[48px] max-h-[160px]"
                style={{
                  height: `${Math.min(input.split("\n").length * 24 + 24, 160)}px`,
                }}
                disabled={sending}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className={cn(
                "flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                input.trim() && !sending
                  ? "bg-forest text-sand hover:bg-forest/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

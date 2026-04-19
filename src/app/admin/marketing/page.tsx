"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Send,
  Clock,
  Check,
  X,
  Mail,
  MessageSquare,
  Instagram,
  Loader2,
  Edit3,
  Calendar,
  Bot,
  User,
} from "lucide-react";

// ---- Types ----

interface MarketingDraft {
  id: string;
  type: "email" | "sms" | "social";
  platform?: string;
  subject?: string;
  content: string;
  audience?: string;
  status: "draft" | "pending_approval" | "approved" | "sent" | "rejected";
  created_at: string;
  ai_generated: boolean;
  feedback?: string;
}

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ---- Main Component ----

export default function AdminMarketingPage() {
  const [drafts, setDrafts] = useState<MarketingDraft[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your Kynda Marketing Agent. I can help you:\n\n• Draft email campaigns (new roast launches, seasonal promos)\n• Write SMS messages (flash sales, order updates)\n• Create social media posts (Instagram, Facebook)\n• Plan marketing strategies\n\nWhat would you like to work on?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function sendMessage() {
    if (!input.trim() || thinking) return;

    const userMsg: AgentMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setAgentMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/marketing/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...agentMessages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const assistantMsg: AgentMessage = {
        role: "assistant",
        content: data.response ?? "I'm not sure how to help with that. Could you rephrase?",
        timestamp: new Date().toISOString(),
      };

      setAgentMessages((prev) => [...prev, assistantMsg]);

      // If the agent created a draft, add it
      if (data.draft) {
        setDrafts((prev) => [data.draft, ...prev]);
      }
    } catch (err) {
      setAgentMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Let me try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function approveDraft(id: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "approved" } : d))
    );
  }

  function rejectDraft(id: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "rejected" } : d))
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-espresso">
          Marketing Agent
        </h1>
        <p className="mt-1 text-sm text-mocha">
          AI-powered marketing assistant with human approval. Nothing goes out
          without your sign-off.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: Agent Chat */}
        <div className="rounded-xl border border-latte/20 bg-white">
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-latte/20 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rust/10">
              <Bot className="h-4 w-4 text-rust" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-espresso">
                Marketing Agent
              </h2>
              <p className="text-xs text-mocha">Powered by AI · Human approval required</p>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {agentMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rust/10">
                      <Bot className="h-4 w-4 text-rust" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-espresso text-cream"
                        : "bg-cream text-espresso"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-espresso/10">
                      <User className="h-4 w-4 text-espresso" />
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rust/10">
                    <Bot className="h-4 w-4 text-rust" />
                  </div>
                  <div className="rounded-2xl bg-cream px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-mocha" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-latte/20 px-6 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to draft a campaign, plan content, or strategize..."
                className="input-field flex-1"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="btn-primary"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: Drafts & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-latte/20 bg-white p-6">
            <h2 className="font-heading text-lg font-semibold text-espresso">
              Quick Actions
            </h2>
            <div className="mt-4 space-y-2">
              {[
                {
                  icon: Mail,
                  label: "Draft welcome email",
                  prompt: "Draft a welcome email for new subscribers",
                },
                {
                  icon: MessageSquare,
                  label: "Write SMS promo",
                  prompt: "Write an SMS for a flash sale this weekend",
                },
                {
                  icon: Instagram,
                  label: "Create social post",
                  prompt: "Create an Instagram post for our new seasonal roast",
                },
                {
                  icon: Calendar,
                  label: "Plan week content",
                  prompt: "Plan this week's marketing content across all channels",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.prompt);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-mocha transition-all hover:bg-latte/20 hover:text-espresso"
                >
                  <action.icon className="h-4 w-4 text-mocha" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Drafts */}
          <div className="rounded-xl border border-latte/20 bg-white p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-rust" />
              <h2 className="font-heading text-lg font-semibold text-espresso">
                Pending Approval
              </h2>
            </div>
            <p className="mt-1 text-xs text-mocha">
              Nothing leaves without your approval
            </p>

            <div className="mt-4 space-y-3">
              {drafts.filter((d) => d.status === "pending_approval").length === 0 ? (
                <p className="py-4 text-center text-sm text-mocha/60">
                  No drafts pending. Ask the agent to create something!
                </p>
              ) : (
                drafts
                  .filter((d) => d.status === "pending_approval")
                  .map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-lg border border-latte/20 p-4"
                    >
                      <div className="flex items-center gap-2">
                        {draft.type === "email" && <Mail className="h-4 w-4 text-mocha" />}
                        {draft.type === "sms" && <MessageSquare className="h-4 w-4 text-mocha" />}
                        {draft.type === "social" && <Instagram className="h-4 w-4 text-mocha" />}
                        <span className="text-xs font-medium uppercase text-mocha">
                          {draft.type}
                        </span>
                        <Sparkles className="h-3 w-3 text-rust" />
                      </div>
                      {draft.subject && (
                        <p className="mt-2 font-medium text-espresso">
                          {draft.subject}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-mocha line-clamp-3">
                        {draft.content}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => approveDraft(draft.id)}
                          className="flex items-center gap-1 rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-sage hover:bg-sage/30"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectDraft(draft.id)}
                          className="flex items-center gap-1 rounded-full bg-rust/10 px-3 py-1 text-xs font-medium text-rust hover:bg-rust/20"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                        <button className="flex items-center gap-1 rounded-full bg-latte/20 px-3 py-1 text-xs font-medium text-mocha hover:bg-latte/40">
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

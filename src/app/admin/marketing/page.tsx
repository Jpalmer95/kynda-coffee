"use client";

import Link from "next/link";
import { useState } from "react";
import { Send, Loader2, BotMessageSquare, ImageIcon, ArrowRight, ShieldCheck, Sparkles, Mail, BarChart3, FolderOpen, Zap } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function MarketingPage() {
  const { toast } = useToast();
  
  // Existing push notification state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; failed?: number } | null>(null);

  // New email campaign state
  const [emailTrigger, setEmailTrigger] = useState<"abandoned-cart" | "win-back" | "review-request">("abandoned-cart");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent?: number; note?: string } | null>(null);

  async function handleSendPush() {
    if (!title.trim() || !body.trim()) {
      toast("Title and body are required", "error");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body, url: url || "/" }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ sent: data.sent, failed: data.failed });
        toast(`Push sent to ${data.sent} devices`, "success");
      } else {
        toast(data.error || "Failed to send", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleSendEmailCampaign() {
    setEmailSending(true);
    setEmailResult(null);

    try {
      const res = await fetch("/api/retention/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: emailTrigger }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailResult({ sent: data.sent, note: data.note });
        toast(data.note || `Email trigger sent successfully`, "success");
      } else {
        toast(data.error || "Failed to trigger emails", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-bold text-espresso">Marketing</h1>
      <p className="text-sm text-mocha">Send automated emails and push notifications.</p>

      {/* AI Marketing Chat Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8 max-w-5xl">
        <Link
          href="/admin/marketing/dashboard"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Command Center
              <span className="text-xs font-body font-normal px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pipeline overview, growth insights, platform status, quick actions.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/media-drop"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Media Drop
              <span className="text-xs font-body font-normal px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload raw photos and videos — starts the content pipeline.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/validator"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <Zap className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              X Validator
              <span className="text-xs font-body font-normal px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Score posts against the open-source X ranking algorithm.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/chat"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <BotMessageSquare className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              AI Chat
              <span className="text-xs font-body font-normal px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Social posts, hashtags, content calendars.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/images"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Image Pipeline
              <span className="text-xs font-body font-normal px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Resize, watermark, AI alt-text for all platforms.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/social"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <Send className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Social Posts
              <span className="text-xs font-body font-normal px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Schedule and publish to Instagram, X, Facebook.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/content-drop"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Content Drop
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drop a feature image → auto-drafted posts in the approval queue.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/newsletters"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <Mail className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Newsletters
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate from specials, approve, and send to subscribers.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          href="/admin/marketing/approvals"
          className="flex items-center gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5 hover:bg-forest/10 transition-colors group"
        >
          <div className="h-12 w-12 rounded-xl bg-forest/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-6 w-6 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              Approval Queue
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review and approve agent-drafted posts before they go live.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-forest opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
      <div className="mt-8 max-w-2xl rounded-xl border border-latte/20 bg-card p-6">
        <h2 className="font-heading text-xl font-semibold text-espresso mb-4 flex items-center gap-2">
          <Send className="h-5 w-5" /> Email Automation
        </h2>
        <p className="text-sm text-mocha mb-4">Trigger real email campaigns using the new centralized service.</p>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-mocha">Campaign</label>
            <select 
              value={emailTrigger} 
              onChange={(e) => setEmailTrigger(e.target.value as any)}
              className="input-field w-full mt-1"
            >
              <option value="abandoned-cart">Abandoned Cart Recovery</option>
              <option value="win-back">Win-Back / Lapsed Customers</option>
              <option value="review-request">Post-Purchase Review Request</option>
            </select>
          </div>

          <button
            onClick={handleSendEmailCampaign}
            disabled={emailSending}
            className="btn-primary whitespace-nowrap px-6 h-[42px] flex items-center gap-2"
          >
            {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Trigger Campaign
          </button>
        </div>

        {emailResult && (
          <div className="mt-4 p-3 bg-sage/10 border border-sage/20 rounded-lg text-sm text-sage">
            {emailResult.sent !== undefined && `Sent ${emailResult.sent} emails. `}
            {emailResult.note}
          </div>
        )}
      </div>

      {/* Push Notifications Section (existing) */}
      <div className="mt-8 max-w-xl space-y-4">
        <div className="rounded-xl border border-latte/20 bg-card p-6">
          <h2 className="font-heading text-xl font-semibold text-espresso mb-4">Push Notifications</h2>
          
          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Notification Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New Roast Alert!" className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Message Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ethiopian Yirgacheffe is back in stock..." rows={3} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Target URL (optional)</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/shop/product/ethiopian-yirgacheffe" className="input-field" />
          </div>

          <button
            onClick={handleSendPush}
            disabled={sending}
            className="mt-4 btn-primary w-full flex justify-center items-center gap-2 py-3"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? "Sending Push..." : "Send Push Notification"}
          </button>

          {result && (
            <div className="mt-3 text-sm text-sage">
              Sent to {result.sent} devices. Failed: {result.failed ?? 0}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

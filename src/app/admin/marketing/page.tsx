"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function MarketingPage() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; failed?: number } | null>(null);

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
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "",
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

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-bold text-espresso">Marketing</h1>
      <p className="text-sm text-mocha">Send push notifications to subscribed devices.</p>

      <div className="mt-6 max-w-xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-espresso">Notification Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New Roast Alert!"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-espresso">Message Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ethiopian Yirgacheffe is back in stock..."
            rows={3}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-espresso">Target URL (optional)</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/shop/product/ethiopian-yirgacheffe"
            className="input-field"
          />
        </div>
        <button
          onClick={handleSendPush}
          disabled={sending}
          className="btn-primary"
        >
          {sending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Send Push Notification</>
          )}
        </button>
        {result && (
          <div className="rounded-lg bg-sage/10 p-3 text-sm text-sage">
            Sent: {result.sent} | Failed: {result.failed}
          </div>
        )}
      </div>
    </div>
  );
}

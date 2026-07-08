"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Brain,
  DollarSign,
  Loader2,
  Package,
  Send,
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle,
  Coffee,
  Mail,
} from "lucide-react";

type Snapshot = {
  generated_at: string;
  revenue: {
    today_cents: number;
    today_orders: number;
    revenue_7d_cents: number;
    revenue_30d_cents: number;
    wow_growth_pct: number | null;
    avg_ticket_cents: number;
  };
  customers: { total: number; new_30d: number; newsletter_subscribers: number };
  products: { active_count: number; low_stock_count: number };
  marketing: { pending_approvals: number; social_posts_30d: number };
  operations: {
    open_inventory_alerts: number;
    new_b2b_leads: number;
    pending_schedule_requests: number;
    upcoming_specials: number;
    waste_total_30d_cents: number;
  };
  top_products: { name: string; order_count: number; revenue_cents: number }[];
  recent_waste: { name: string; reason: string; total_cost_cents: number; waste_date: string }[];
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const QUICK_PROMPTS = [
  "Give me a strategic brief for this week",
  "What are the biggest risks right now?",
  "How can I increase average ticket size?",
  "Analyze my waste trends and suggest fixes",
  "What products should I promote?",
];

export default function StrategistPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAIConfigured] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/strategist", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load snapshot");
      setSnapshot(data.snapshot);
      setAIConfigured(data.ai_configured ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load snapshot");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-mocha">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading business snapshot...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-max py-10">
        <div className="rounded-2xl border border-bronze/30 bg-bronze/10 p-4 text-espresso">{error}</div>
      </div>
    );
  }

  const s = snapshot!;

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const newMessages: ChatMsg[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setChatMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch (err) {
      setChatMessages([...newMessages, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="container-max py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Brain className="h-7 w-7 text-forest" /> AI Strategist
          </h1>
          <p className="text-sm text-mocha">
            Business snapshot generated {new Date(s.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">
          <Loader2 className="mr-2 h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Hermes integration banner */}
      <div className="mb-6 rounded-2xl border border-forest/20 bg-forest/5 p-4">
        <div className="flex items-start gap-3">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-espresso">Hermes Strategist Skill</h3>
            <p className="mt-1 text-sm text-mocha">
              This dashboard shows live business data. For AI strategic analysis, invoke the Hermes
              <code className="mx-1 rounded bg-latte/20 px-1.5 py-0.5 text-xs">kynda-strategist</code>
              skill from your Hermes CLI or Telegram — it queries this data and provides actionable recommendations.
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <code className="rounded bg-latte/20 px-2 py-1 text-mocha">hermes run kynda-strategist</code>
              <span className="text-mocha">or just ask Hermes: "Give me a strategic brief for Kynda Coffee"</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label="Today"
          value={money(s.revenue.today_cents)}
          sub={`${s.revenue.today_orders} orders`}
        />
        <MetricCard
          icon={TrendingUp}
          label="7-Day Revenue"
          value={money(s.revenue.revenue_7d_cents)}
          sub={s.revenue.wow_growth_pct !== null ? `${s.revenue.wow_growth_pct >= 0 ? "+" : ""}${s.revenue.wow_growth_pct}% WoW` : "No prior data"}
          highlight={s.revenue.wow_growth_pct !== null && s.revenue.wow_growth_pct < 0 ? "bad" : s.revenue.wow_growth_pct !== null && s.revenue.wow_growth_pct > 0 ? "good" : undefined}
        />
        <MetricCard
          icon={DollarSign}
          label="30-Day Revenue"
          value={money(s.revenue.revenue_30d_cents)}
        />
        <MetricCard
          icon={DollarSign}
          label="Avg Ticket"
          value={money(s.revenue.avg_ticket_cents)}
        />
      </div>

      {/* Customers + Marketing + Operations */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total Customers"
          value={String(s.customers.total)}
          sub={`+${s.customers.new_30d} new (30d)`}
        />
        <MetricCard
          icon={Mail}
          label="Newsletter"
          value={String(s.customers.newsletter_subscribers)}
        />
        <MetricCard
          icon={Package}
          label="Active Products"
          value={String(s.products.active_count)}
          sub={s.products.low_stock_count > 0 ? `${s.products.low_stock_count} low stock` : "All healthy"}
          highlight={s.products.low_stock_count > 0 ? "bad" : "good"}
        />
        <MetricCard
          icon={TrendingDown}
          label="Waste (30d)"
          value={money(s.operations.waste_total_30d_cents)}
          highlight={s.operations.waste_total_30d_cents > 0 ? "bad" : undefined}
        />
      </div>

      {/* Operations alerts */}
      {(s.operations.open_inventory_alerts > 0 || s.operations.new_b2b_leads > 0 || s.operations.pending_schedule_requests > 0 || s.marketing.pending_approvals > 0) && (
        <div className="mb-6 rounded-2xl border border-bronze/30 bg-bronze/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-espresso">
            <AlertTriangle className="h-4 w-4 text-bronze" /> Items Needing Attention
          </h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {s.operations.open_inventory_alerts > 0 && (
              <Link href="/admin/inventory" className="rounded-lg bg-bronze/10 px-3 py-1.5 text-espresso hover:bg-bronze/20">
                {s.operations.open_inventory_alerts} inventory alerts →
              </Link>
            )}
            {s.marketing.pending_approvals > 0 && (
              <Link href="/admin/marketing/approvals" className="rounded-lg bg-bronze/10 px-3 py-1.5 text-espresso hover:bg-bronze/20">
                {s.marketing.pending_approvals} marketing approvals →
              </Link>
            )}
            {s.operations.new_b2b_leads > 0 && (
              <Link href="/admin/b2b" className="rounded-lg bg-bronze/10 px-3 py-1.5 text-espresso hover:bg-bronze/20">
                {s.operations.new_b2b_leads} new B2B leads →
              </Link>
            )}
            {s.operations.pending_schedule_requests > 0 && (
              <Link href="/admin/schedule" className="rounded-lg bg-bronze/10 px-3 py-1.5 text-espresso hover:bg-bronze/20">
                {s.operations.pending_schedule_requests} schedule requests →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Top products + Recent waste */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-espresso">
            <Coffee className="h-4 w-4 text-forest" /> Top Products (30d)
          </h3>
          {s.top_products.length === 0 ? (
            <p className="py-4 text-sm text-mocha">No order data for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-latte/20 text-left text-xs text-mocha">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Product</th>
                  <th className="py-2 pr-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {s.top_products.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 text-mocha">{i + 1}</td>
                    <td className="py-2 pr-2 text-espresso">{p.name}</td>
                    <td className="py-2 pr-2 text-right text-mocha">{p.order_count}</td>
                    <td className="py-2 text-right font-semibold text-espresso">{money(p.revenue_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent waste */}
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-espresso">
            <TrendingDown className="h-4 w-4 text-bronze" /> Recent Waste (30d)
          </h3>
          {s.recent_waste.length === 0 ? (
            <p className="py-4 text-sm text-mocha">No waste logged. Good!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-latte/20 text-left text-xs text-mocha">
                  <th className="py-2 pr-2 font-medium">Item</th>
                  <th className="py-2 pr-2 font-medium">Reason</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {s.recent_waste.slice(0, 10).map((w, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 text-espresso">{w.name}</td>
                    <td className="py-2 pr-2 text-mocha">{w.reason}</td>
                    <td className="py-2 text-right font-medium text-bronze">{money(w.total_cost_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {s.recent_waste.length > 0 && (
            <Link href="/admin/inventory/waste" className="mt-3 inline-flex items-center gap-1 text-xs text-forest hover:underline">
              View all waste <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* AI Strategist Chat */}
      <div className="mt-8 rounded-2xl border border-latte/20 bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-espresso">
          <Brain className="h-4 w-4 text-forest" /> Ask the AI Strategist
        </h3>

        {!aiConfigured ? (
          <div className="rounded-xl border border-bronze/30 bg-bronze/5 p-4 text-sm text-espresso">
            <p className="font-medium">AI not configured</p>
            <p className="mt-1 text-mocha">
              Set <code className="rounded bg-latte/20 px-1.5 py-0.5 text-xs">AI_API_KEY</code> (and optionally{" "}
              <code className="rounded bg-latte/20 px-1.5 py-0.5 text-xs">AI_BASE_URL</code>,{" "}
              <code className="rounded bg-latte/20 px-1.5 py-0.5 text-xs">AI_MODEL</code>) in your environment variables.
              Works with OpenRouter, OpenAI, or any OpenAI-compatible API.
            </p>
            <p className="mt-2 text-mocha">
              You can also use the Hermes <code className="rounded bg-latte/20 px-1.5 py-0.5 text-xs">kynda-strategist</code> skill from CLI or Telegram.
            </p>
          </div>
        ) : (
          <>
            {/* Quick prompts */}
            {chatMessages.length === 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setChatInput(prompt)}
                    className="rounded-full border border-latte/40 bg-cream px-3 py-1.5 text-xs text-espresso hover:bg-latte/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            {chatMessages.length > 0 && (
              <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-forest text-white"
                          : "bg-cream text-espresso"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-cream px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-mocha" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about strategy, growth, costs, operations..."
                className="input-field flex-1"
                disabled={chatLoading}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-primary shrink-0">
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: "good" | "bad";
}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${
      highlight === "bad" ? "border-bronze/30" : highlight === "good" ? "border-sage/30" : "border-latte/20"
    }`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${highlight === "bad" ? "text-bronze" : "text-forest"}`} />
        <span className="text-xs text-mocha">{label}</span>
      </div>
      <p className={`mt-2 font-heading text-xl font-bold ${highlight === "bad" ? "text-bronze" : "text-espresso"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-mocha">{sub}</p>}
    </div>
  );
}

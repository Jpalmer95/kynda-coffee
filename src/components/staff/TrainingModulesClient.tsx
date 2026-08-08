"use client";

/**
 * TrainingModulesClient — staff-facing training list backed by
 * `training_modules` (the table /admin/training manages). Grouped by
 * category with expandable markdown content and one-tap completion.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  GraduationCap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingModule {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  order_index: number;
  is_required: boolean;
  updated_at: string;
}

type CompletedMap = Record<string, string>;

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  opening: "Opening",
  closing: "Closing",
  drinks: "Drinks",
  food: "Food",
  equipment: "Equipment",
  safety: "Safety",
  customer_service: "Customer Service",
  maintenance: "Maintenance",
};

const CATEGORY_ORDER = [
  "onboarding", "opening", "closing", "drinks", "food",
  "equipment", "safety", "customer_service", "maintenance",
];

/** Tiny safe markdown renderer for admin-authored content. */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  const flushList = () => {
    if (!listType) return;
    out.push(
      listType === "ul" ? (
        <ul key={`ul-${key++}`} className="my-2 list-disc space-y-1 pl-5">
          {listBuffer}
        </ul>
      ) : (
        <ol key={`ol-${key++}`} className="my-2 list-decimal space-y-1 pl-5">
          {listBuffer}
        </ol>
      )
    );
    listBuffer = [];
    listType = null;
  };

  const inline = (text: string) => {
    const parts: React.ReactNode[] = [];
    // **bold** and `code`
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const token = m[0];
      if (token.startsWith("**")) parts.push(<strong key={i++}>{token.slice(2, -2)}</strong>);
      else parts.push(<code key={i++} className="rounded bg-latte/20 px-1 py-0.5 text-xs">{token.slice(1, -1)}</code>);
      last = m.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, "");
      const cls = level === 1 ? "text-xl font-bold" : level === 2 ? "text-lg font-semibold" : "text-base font-semibold";
      out.push(<h3 key={key++} className={cn("mt-4 mb-1 text-espresso first:mt-0", cls)}>{inline(text)}</h3>);
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(<li key={key++}>{inline(line.replace(/^[-*]\s*/, ""))}</li>);
      continue;
    }
    if (/^\d+[.)]\s/.test(line)) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(<li key={key++}>{inline(line.replace(/^\d+[.)]\s*/, ""))}</li>);
      continue;
    }
    flushList();
    out.push(<p key={key++} className="my-1.5 text-sm leading-relaxed text-espresso/90">{inline(line)}</p>);
  }
  flushList();
  return out;
}

export default function TrainingModulesClient({
  initialModules,
  initialCompleted,
}: {
  initialModules: TrainingModule[];
  initialCompleted: CompletedMap;
}) {
  const [modules, setModules] = useState<TrainingModule[]>(initialModules);
  const [completed, setCompleted] = useState<CompletedMap>(initialCompleted);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/training", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load training");
      setModules(data.modules ?? []);
      setCompleted(data.completed ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load training");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleComplete(moduleId: string, currentlyDone: boolean) {
    setSavingId(moduleId);
    setError(null);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, completed: !currentlyDone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setCompleted((prev) => {
        const next = { ...prev };
        if (!currentlyDone) next[moduleId] = new Date().toISOString();
        else delete next[moduleId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update completion");
    } finally {
      setSavingId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, TrainingModule[]>();
    for (const m of modules) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    const keys = CATEGORY_ORDER.filter((c) => map.has(c)).concat(
      [...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c))
    );
    return keys.map((c) => ({ category: c, items: map.get(c)! }));
  }, [modules]);

  const totalCount = modules.length;
  const doneCount = Object.keys(completed).length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Progress card */}
      <div className="mb-6 rounded-xl border border-latte/20 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-espresso">Training progress</span>
          <span className="text-sm font-bold text-forest">{doneCount}/{totalCount} modules · {pct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-latte/20">
          <div className="h-2 rounded-full bg-forest transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        {error && <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading training...
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-mocha/40" />
          <p className="mt-4 text-mocha">No training modules yet.</p>
          <p className="mt-1 text-sm text-mocha/70">Your manager will add modules here as they&apos;re ready.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, items }) => {
            const catDone = items.filter((m) => completed[m.id]).length;
            return (
              <section key={category}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-espresso">
                    <BookOpen className="h-4 w-4 text-forest" />
                    {CATEGORY_LABELS[category] ?? category}
                  </h2>
                  <span className="text-xs font-medium text-mocha">{catDone}/{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((m) => {
                    const done = !!completed[m.id];
                    const isOpen = open === m.id;
                    return (
                      <div key={m.id} className={cn("overflow-hidden rounded-xl border bg-card transition", done ? "border-green-200" : "border-latte/20")}>
                        <button
                          onClick={() => setOpen(isOpen ? null : m.id)}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-latte/5"
                        >
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-forest" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-mocha/40" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-espresso">{m.title}</span>
                              {m.is_required && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Required</span>
                              )}
                            </div>
                            {m.description && <p className="truncate text-sm text-mocha">{m.description}</p>}
                          </div>
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-mocha transition-transform", isOpen && "rotate-180")} />
                        </button>

                        {isOpen && (
                          <div className="border-t border-latte/10 px-4 py-4">
                            <div className="max-h-[50vh] overflow-y-auto pr-1">
                              {m.content ? renderMarkdown(m.content) : <p className="text-sm text-mocha">No content yet.</p>}
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-latte/10 pt-3">
                              <span className="text-xs text-mocha">
                                {done ? `Completed ${new Date(completed[m.id]).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Not completed yet"}
                              </span>
                              <button
                                onClick={() => toggleComplete(m.id, done)}
                                disabled={savingId === m.id}
                                className={cn(
                                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-60",
                                  done ? "border border-latte/30 text-mocha hover:border-red-300 hover:text-red-600" : "bg-forest text-sand hover:opacity-90"
                                )}
                              >
                                {savingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <RefreshCw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                {done ? "Mark incomplete" : "Mark complete"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

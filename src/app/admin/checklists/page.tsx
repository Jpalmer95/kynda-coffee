"use client";

/**
 * /admin/checklists — completion log with filters (member, date, type)
 * + inline checklist item editor for each shift type.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Completion {
  id: string;
  checklist_type: string;
  completed_items: number[];
  completed_at: string;
  notes: string | null;
  member_name: string;
  member_email: string | null;
  checklist_title: string;
  checklist_items: { text: string; order: number; is_critical?: boolean }[];
}

interface Checklist {
  id: string;
  title: string;
  description: string | null;
  type: string;
  items: { text: string; order: number; is_critical?: boolean }[];
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  opening: "Opening",
  "mid-shift": "Mid-Shift",
  closing: "Closing",
};

export default function AdminChecklistsPage() {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"log" | "edit">("log");

  // Filters
  const [memberQuery, setMemberQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<{ text: string; order: number; is_critical: boolean }[]>([]);
  const [savingItems, setSavingItems] = useState(false);

  const loadLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (memberQuery) params.set("member", memberQuery);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/admin/checklists/log?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load log");
      setCompletions(data.completions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load log");
    } finally {
      setLoading(false);
    }
  }, [memberQuery, fromDate, toDate, typeFilter]);

  const loadChecklists = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/checklists", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setChecklists(data.checklists ?? []);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    loadLog();
    loadChecklists();
  }, [loadLog, loadChecklists]);

  function startEdit(cl: Checklist) {
    setEditingId(cl.id);
    setEditItems(
      (cl.items ?? []).map((i) => ({
        text: i.text,
        order: i.order,
        is_critical: !!i.is_critical,
      }))
    );
  }

  async function saveItems(cl: Checklist) {
    setSavingItems(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/checklists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cl.id, items: editItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      await loadChecklists();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingItems(false);
    }
  }

  function addEditItem() {
    setEditItems([...editItems, { text: "", order: editItems.length + 1, is_critical: false }]);
  }

  function removeEditItem(idx: number) {
    setEditItems(editItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i + 1 })));
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <ClipboardList className="h-7 w-7 text-forest" /> Shift Checklists
          </h1>
          <p className="text-sm text-mocha">Completion log + editable checklist items</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("log")}
          className={cn("rounded-full border px-4 py-2 text-sm font-medium", tab === "log" ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10")}
        >
          Completion Log
        </button>
        <button
          onClick={() => setTab("edit")}
          className={cn("rounded-full border px-4 py-2 text-sm font-medium", tab === "edit" ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10")}
        >
          Edit Checklists
        </button>
      </div>

      {/* === COMPLETION LOG TAB === */}
      {tab === "log" && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Filter by member name or email..."
                className="w-full rounded-xl border border-latte/30 bg-background py-2.5 pl-9 pr-3 text-sm text-espresso placeholder:text-mocha/60 focus:border-forest focus:outline-none"
              />
            </div>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-latte/30 bg-background px-3 py-2.5 text-sm text-espresso" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-latte/30 bg-background px-3 py-2.5 text-sm text-espresso" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-latte/30 bg-background px-3 py-2.5 text-sm text-espresso">
              <option value="">All types</option>
              <option value="opening">Opening</option>
              <option value="mid-shift">Mid-Shift</option>
              <option value="closing">Closing</option>
            </select>
            <button onClick={loadLog} className="rounded-xl bg-forest px-5 py-2.5 text-sm font-medium text-sand">
              Apply
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading log...
            </div>
          ) : completions.length === 0 ? (
            <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
              No checklist completions found for these filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-latte/20 bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3 text-center">Items Done</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-latte/10">
                  {completions.map((c) => {
                    const totalItems = c.checklist_items?.length ?? 0;
                    const doneItems = c.completed_items?.length ?? 0;
                    const allDone = doneItems === totalItems && totalItems > 0;
                    const isExpanded = expanded === c.id;
                    return (
                      <>
                        <tr key={c.id} className="hover:bg-latte/5 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                          <td className="px-4 py-3 font-medium text-espresso">{c.member_name}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">
                              {TYPE_LABELS[c.checklist_type] ?? c.checklist_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {allDone ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-amber-700">Partial</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-mocha">{doneItems}/{totalItems}</td>
                          <td className="px-4 py-3 text-xs text-mocha">
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {new Date(c.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={c.id + "-expand"} className="bg-latte/5">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="space-y-1">
                                {(c.checklist_items ?? []).map((item, i) => {
                                  const done = c.completed_items?.includes(i);
                                  return (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-forest shrink-0" /> : <Circle className="h-3.5 w-3.5 text-mocha/40 shrink-0" />}
                                      <span className={done ? "text-mocha line-through" : "text-espresso"}>{item.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* === EDIT CHECKLISTS TAB === */}
      {tab === "edit" && (
        <div className="space-y-6">
          {checklists.length === 0 ? (
            <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
              No checklists found. Run migration 044 to seed them.
            </div>
          ) : (
            checklists.map((cl) => (
              <div key={cl.id} className="rounded-2xl border border-latte/20 bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-bold text-espresso">
                      {TYPE_LABELS[cl.type] ?? cl.type} Checklist
                    </h2>
                    {cl.description && <p className="text-sm text-mocha">{cl.description}</p>}
                  </div>
                  {editingId === cl.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveItems(cl)} disabled={savingItems} className="flex items-center gap-1.5 rounded-xl bg-forest px-3 py-1.5 text-xs font-medium text-sand disabled:opacity-60">
                        {savingItems ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-xl border border-latte/30 px-3 py-1.5 text-xs text-mocha">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(cl)} className="flex items-center gap-1.5 rounded-xl border border-latte/30 px-3 py-1.5 text-xs text-mocha hover:border-forest/40">
                      <Pencil className="h-3.5 w-3.5" /> Edit Items
                    </button>
                  )}
                </div>

                {editingId === cl.id ? (
                  <div className="space-y-2">
                    {editItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={item.text}
                          onChange={(e) => setEditItems(editItems.map((it, idx) => idx === i ? { ...it, text: e.target.value } : it))}
                          className="flex-1 rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso"
                          placeholder="Task description..."
                        />
                        <label className="flex items-center gap-1 text-xs text-mocha">
                          <input type="checkbox" checked={item.is_critical} onChange={(e) => setEditItems(editItems.map((it, idx) => idx === i ? { ...it, is_critical: e.target.checked } : it))} className="h-4 w-4 rounded border-latte/40" />
                          Critical
                        </label>
                        <button onClick={() => removeEditItem(i)} disabled={editItems.length === 1} className="rounded-lg p-1.5 text-mocha hover:text-red-600 disabled:opacity-30">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addEditItem} className="flex items-center gap-1.5 rounded-xl border border-latte/30 px-3 py-1.5 text-xs text-espresso hover:border-forest/40">
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {(cl.items ?? []).map((item, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                        <span className="text-xs text-mocha w-6">{i + 1}.</span>
                        <span className="text-espresso">{item.text}</span>
                        {item.is_critical && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Critical</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

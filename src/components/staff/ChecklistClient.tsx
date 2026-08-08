"use client";

/**
 * ChecklistClient — DB-driven shift checklists with per-item completion.
 * Shows who completed it (name) + date. Completions persist to
 * checklist_completions via /api/staff/checklists/complete.
 */

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  RefreshCw,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  text: string;
  order: number;
  is_critical?: boolean;
}

export interface ChecklistData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  items: ChecklistItem[];
}

interface ChecklistClientProps {
  checklists: ChecklistData[];
  completedByType: Record<string, number[]>;
  username: string;
  displayName: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Sun; color: string }> = {
  opening: { label: "Opening", icon: Sun, color: "text-amber-600" },
  "mid-shift": { label: "Mid-Shift", icon: RefreshCw, color: "text-blue-600" },
  closing: { label: "Closing", icon: Moon, color: "text-indigo-600" },
};

export function ChecklistClient({
  checklists: initialChecklists,
  completedByType: initialCompleted,
  username,
  displayName,
}: ChecklistClientProps) {
  const [checklists] = useState<ChecklistData[]>(initialChecklists);
  const [completedMap, setCompletedMap] = useState<Record<string, Set<number>>>(() => {
    const map: Record<string, Set<number>> = {};
    for (const [type, items] of Object.entries(initialCompleted)) {
      map[type] = new Set(items as number[]);
    }
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fallback seeds (only used if DB returned nothing)
  const hasData = checklists.length > 0;

  const allItems: Record<string, ChecklistItem[]> = {};
  for (const cl of checklists) {
    allItems[cl.type] = cl.items;
  }

  // Fallback seeds
  if (!hasData) {
    allItems["opening"] = [
      { text: "Turn on espresso machine — let warm up 20 min", order: 1, is_critical: true },
      { text: "Grind espresso beans — dial in shots", order: 2, is_critical: true },
      { text: "Brew drip coffee (regular + decaf)", order: 3 },
      { text: "Prepare pastry display case", order: 4 },
      { text: "Stock cups, lids, napkins, stirrers", order: 5 },
      { text: "Fill condiment bar (sugar, cream, cinnamon)", order: 6 },
      { text: "Wipe down all counter surfaces", order: 7 },
      { text: "Check refrigerated items — discard expired", order: 8, is_critical: true },
      { text: "Set up POS — log in, check cash drawer", order: 9, is_critical: true },
      { text: "Turn on background music", order: 10 },
    ];
    allItems["closing"] = [
      { text: "Run cleaning cycle on espresso machine", order: 1, is_critical: true },
      { text: "Empty and sanitize grinder", order: 2, is_critical: true },
      { text: "Wash all equipment and utensils", order: 3 },
      { text: "Wipe down espresso machine group heads", order: 4, is_critical: true },
      { text: "Empty drip trays and rinse", order: 5 },
      { text: "Restock cups, lids, and supplies for tomorrow", order: 6 },
      { text: "Clean pastry display case", order: 7 },
      { text: "Wipe down all tables and chairs", order: 8 },
      { text: "Sweep and mop floors", order: 9 },
      { text: "Empty trash and replace liners", order: 10 },
      { text: "Count cash drawer — record on close sheet", order: 11, is_critical: true },
      { text: "Turn off equipment, lights, and music", order: 12 },
      { text: "Lock all doors — set alarm", order: 13, is_critical: true },
    ];
    allItems["mid-shift"] = [
      { text: "Restock supplies as needed", order: 1 },
      { text: "Wipe down tables and condiment bar", order: 2 },
      { text: "Check fridge temps", order: 3, is_critical: true },
      { text: "Refill coffee as needed", order: 4 },
      { text: "Quick sweep of visible floor areas", order: 5 },
    ];
  }

  const types = ["opening", "mid-shift", "closing"].filter((t) => allItems[t]?.length > 0);

  const toggleItem = async (type: string, index: number) => {
    const key = `${type}:${index}`;
    const isChecked = completedMap[type]?.has(index) ?? false;

    // Optimistic update
    setCompletedMap((prev) => {
      const newMap = { ...prev };
      const set = new Set(newMap[type] ?? []);
      if (isChecked) set.delete(index);
      else set.add(index);
      newMap[type] = set;
      return newMap;
    });

    setSaving(key);
    setError(null);

    try {
      const completedIndices = (allItems[type] ?? [])
        .map((_, i) => i)
        .filter((i) => {
          const newSet = new Set(completedMap[type] ?? []);
          if (isChecked) newSet.delete(index);
          else newSet.add(index);
          return newSet.has(i);
        });

      const clId = checklists.find((c) => c.type === type)?.id;

      const res = await fetch("/api/staff/checklists/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist_type: type,
          checklist_id: clId,
          completed_items: completedIndices,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
    } catch (e) {
      // Revert optimistic update
      setCompletedMap((prev) => {
        const newMap = { ...prev };
        const set = new Set(newMap[type] ?? []);
        if (isChecked) set.add(index);
        else set.delete(index);
        newMap[type] = set;
        return newMap;
      });
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const totalCompleted = Object.values(completedMap).reduce((sum, s) => sum + s.size, 0);
  const totalItems = types.reduce((sum, t) => sum + (allItems[t]?.length ?? 0), 0);

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6 rounded-xl border border-latte/20 bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-forest" />
            <span className="text-sm font-medium text-espresso">
              {displayName} · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <span className="text-sm font-bold text-forest">
            {totalCompleted}/{totalItems} tasks
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-latte/20">
          <div
            className="h-2 rounded-full bg-forest transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-8">
        {types.map((type) => {
          const meta = TYPE_META[type] ?? { label: type, icon: ClipboardListIcon, color: "text-mocha" };
          const Icon = meta.icon;
          const items = allItems[type] ?? [];
          const completedSet = completedMap[type] ?? new Set<number>();
          const completedInList = completedSet.size;
          const allDone = completedInList === items.length && items.length > 0;

          return (
            <section key={type} className={cn("rounded-xl border bg-card overflow-hidden", allDone ? "border-green-200" : "border-latte/20")}>
              <div className="flex items-center justify-between p-5 border-b border-latte/10">
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", meta.color)} />
                  <div>
                    <h2 className="font-heading text-xl font-bold text-espresso">
                      {meta.label}
                    </h2>
                    {checklists.find((c) => c.type === type)?.description && (
                      <p className="text-xs text-mocha">{checklists.find((c) => c.type === type)?.description}</p>
                    )}
                  </div>
                </div>
                <span className={cn("text-sm font-medium", allDone ? "text-forest" : "text-mocha")}>
                  {completedInList}/{items.length}
                </span>
              </div>
              <div className="p-2">
                {items.map((item, i) => {
                  const key = `${type}:${i}`;
                  const isChecked = completedSet.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleItem(type, i)}
                      disabled={saving === key}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-background min-h-[44px]",
                        isChecked && "opacity-60"
                      )}
                    >
                      {saving === key ? (
                        <Loader2 className="h-5 w-5 shrink-0 text-forest mt-0.5 animate-spin" />
                      ) : isChecked ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-forest mt-0.5" />
                      ) : (
                        <Circle className={cn("h-5 w-5 shrink-0 mt-0.5", item.is_critical ? "text-amber-500" : "text-mocha/40")} />
                      )}
                      <span className={cn("text-sm", isChecked ? "text-mocha line-through" : "text-espresso")}>
                        {item.text}
                        {item.is_critical && !isChecked && (
                          <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Critical</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {allDone && (
                <div className="border-t border-green-200 bg-green-50/50 px-5 py-2.5 text-xs text-green-700">
                  ✓ Completed by {displayName} on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ClipboardListIcon() {
  return <RefreshCw className="h-5 w-5" />;
}

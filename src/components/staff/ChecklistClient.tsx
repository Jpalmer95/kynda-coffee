"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";

const SEED_OPENING = [
  "Turn on espresso machine — let warm up 20 min",
  "Grind espresso beans — dial in shots",
  "Brew drip coffee (regular + decaf)",
  "Prepare pastry display case",
  "Stock cups, lids, napkins, stirrers",
  "Fill condiment bar (sugar, cream, cinnamon)",
  "Wipe down all counter surfaces",
  "Check refrigerated items — discard expired",
  "Set up POS — log in, check cash drawer",
  "Turn on background music",
];

const SEED_CLOSING = [
  "Run cleaning cycle on espresso machine",
  "Empty and sanitize grinder",
  "Wash all equipment and utensils",
  "Wipe down espresso machine group heads",
  "Empty drip trays and rinse",
  "Restock cups, lids, and supplies for tomorrow",
  "Clean pastry display case",
  "Wipe down all tables and chairs",
  "Sweep and mop floors",
  "Empty trash and replace liners",
  "Count cash drawer — record on close sheet",
  "Turn off equipment, lights, and music",
  "Lock all doors — set alarm",
];

const SEED_MIDSHIFT = [
  "Restock supplies as needed",
  "Wipe down tables and condiment bar",
  "Check fridge temps",
  "Refill coffee as needed",
  "Quick sweep of visible floor areas",
];

type ChecklistType = "opening" | "closing" | "mid-shift";

const CHECKLISTS: Record<ChecklistType, { label: string; icon: typeof Sun; items: string[]; color: string }> = {
  opening: { label: "Opening", icon: Sun, items: SEED_OPENING, color: "text-amber-600" },
  "mid-shift": { label: "Mid-Shift", icon: RefreshCw, items: SEED_MIDSHIFT, color: "text-blue-600" },
  closing: { label: "Closing", icon: Moon, items: SEED_CLOSING, color: "text-indigo-600" },
};

interface ChecklistClientProps {
  completedItems: string[];
  username: string;
}

export function ChecklistClient({ completedItems: initial, username }: ChecklistClientProps) {
  const [completedKeySet, setCompletedKeySet] = useState<Set<string>>(new Set(initial));
  const [saving, setSaving] = useState<string | null>(null);

  const toggleItem = async (type: ChecklistType, index: number) => {
    const key = `${type}:${index}`;
    const isChecked = completedKeySet.has(key);

    // Optimistic update
    const newSet = new Set(completedKeySet);
    if (isChecked) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setCompletedKeySet(newSet);

    // Persist to Supabase
    try {
      const completedIndices = CHECKLISTS[type].items.map((_, i) => `${type}:${i}`)
        .filter((k) => newSet.has(k))
        .map((k) => parseInt(k.split(":")[1]));

      setSaving(key);

      if (completedIndices.length > 0) {
        await fetch("/api/staff/checklists/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklist_type: type,
            completed_items: completedIndices,
          }),
        });
      }
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(null);
    }
  };

  const totalCompleted = completedKeySet.size;
  const totalItems = Object.values(CHECKLISTS).reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6 rounded-xl border border-latte/20 bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-espresso">Today&apos;s Progress</span>
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
        {(Object.entries(CHECKLISTS) as [ChecklistType, typeof CHECKLISTS["opening"]][]).map(
          ([type, check]) => {
            const Icon = check.icon;
            const completedInList = check.items.filter((_, i) =>
              completedKeySet.has(`${type}:${i}`)
            ).length;

            return (
              <section key={type} className="rounded-xl border border-latte/20 bg-card overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-latte/10">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${check.color}`} />
                    <h2 className="font-heading text-xl font-bold text-espresso">
                      {check.label}
                    </h2>
                  </div>
                  <span className={`text-sm font-medium ${
                    completedInList === check.items.length ? "text-forest" : "text-mocha"
                  }`}>
                    {completedInList}/{check.items.length}
                  </span>
                </div>
                <div className="p-2">
                  {check.items.map((item, i) => {
                    const key = `${type}:${i}`;
                    const isChecked = completedKeySet.has(key);

                    return (
                      <button
                        key={i}
                        onClick={() => toggleItem(type, i)}
                        disabled={saving === key}
                        className={[
                          "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition",
                          "hover:bg-background min-h-[44px]",
                          isChecked ? "opacity-60" : "",
                        ].join(" ")}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-forest mt-0.5" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-mocha/40 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${
                            isChecked ? "text-mocha line-through" : "text-espresso"
                          }`}
                        >
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          }
        )}
      </div>
    </div>
  );
}

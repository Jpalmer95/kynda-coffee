"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Coffee,
  Droplets,
  Candy,
  Leaf,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import type {
  PosCatalogItem,
  PosCatalogModifierList,
  PosCatalogModifier,
} from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
import { useMenuCartStore } from "@/hooks/useMenuCart";

// ── Base Drink Definitions ────────────────────────────────────────────────

interface DrinkBase {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  icon: React.ReactNode;
  /** Category name keywords to match modifier lists from */
  modifierListHints: string[];
}

const DRINK_BASES: DrinkBase[] = [
  {
    id: "espresso",
    name: "Espresso",
    description: "Single or double shot — the foundation of any great drink",
    priceCents: 350,
    icon: <Coffee className="h-6 w-6" />,
    modifierListHints: ["milk", "syrup", "extra", "shot", "size", "temperature"],
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    description: "Smooth, bold, and slow-steeped for 20 hours",
    priceCents: 450,
    icon: <Droplets className="h-6 w-6" />,
    modifierListHints: ["milk", "syrup", "extra", "size", "foam"],
  },
  {
    id: "hot-tea",
    name: "Hot Tea",
    description: "Choose from our premium loose-leaf selection",
    priceCents: 350,
    icon: <Leaf className="h-6 w-6" />,
    modifierListHints: ["milk", "sweetener", "extra"],
  },
  {
    id: "blended",
    name: "Blended",
    description: "Ice-blended with your choice of flavors",
    priceCents: 550,
    icon: <Candy className="h-6 w-6" />,
    modifierListHints: ["milk", "syrup", "extra", "whip", "topping"],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────

interface BuildYourOwnProps {
  items: PosCatalogItem[];
}

// ── Component ─────────────────────────────────────────────────────────────

export function BuildYourOwn({ items }: BuildYourOwnProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBase, setSelectedBase] = useState<DrinkBase | null>(null);
  const [selectedMods, setSelectedMods] = useState<Map<string, PosCatalogModifier>>(new Map());
  const [qty, setQty] = useState(1);

  const cart = useMenuCartStore();

  // ── Derive modifier pool from catalog ────────────────────────────────────

  const allModifierLists = useMemo(() => {
    const seen = new Map<string, PosCatalogModifierList>();
    for (const item of items) {
      for (const list of item.modifierLists) {
        if (!seen.has(list.providerModifierListId)) {
          seen.set(list.providerModifierListId, list);
        }
      }
    }
    return Array.from(seen.values());
  }, [items]);

  // Filter lists that match the selected base's hints
  const filteredLists = useMemo(() => {
    if (!selectedBase) return [];
    return allModifierLists.filter((list) => {
      const nameLower = list.name.toLowerCase();
      return selectedBase.modifierListHints.some((hint) =>
        nameLower.includes(hint.toLowerCase())
      );
    });
  }, [allModifierLists, selectedBase]);

  // ── Modifier selection ──────────────────────────────────────────────────

  function toggleModifier(list: PosCatalogModifierList, mod: PosCatalogModifier) {
    const isSingle = list.selectionType === "single" || list.selectionType === "SINGLE" || list.maxSelectedModifiers === 1;
    setSelectedMods((prev) => {
      const next = new Map(prev);
      if (isSingle) {
        // Radio: same list replaces
        if (next.get(list.providerModifierListId)?.providerModifierId === mod.providerModifierId) {
          next.delete(list.providerModifierListId);
        } else {
          next.set(list.providerModifierListId, mod);
        }
      } else {
        // Checkbox: toggle
        const key = list.providerModifierListId + "|" + mod.providerModifierId;
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, mod);
        }
      }
      return next;
    });
  }

  // ── Price calculation ───────────────────────────────────────────────────

  const basePrice = selectedBase?.priceCents ?? 0;
  const modsTotal = Array.from(selectedMods.values()).reduce((s, m) => s + m.priceCents, 0);
  const unitPrice = basePrice + modsTotal;
  const lineTotal = unitPrice * qty;

  // ── Add to cart ─────────────────────────────────────────────────────────

  function addToCart() {
    if (!selectedBase) return;

    const mods = Array.from(selectedMods.values());
    const modNames = mods.map((m) => m.name);
    const modIds = mods.map((m) => m.providerModifierId);

    const customItem = {
      providerItemId: `byo-${selectedBase.id}`,
      providerVariationId: "custom",
      itemName: `Build Your Own — ${selectedBase.name}`,
      variationName: "Custom",
      quantity: qty,
      modifierIds: modIds,
      modifierNames: modNames,
      unitPriceCents: unitPrice,
      imageUrl: undefined,
      categoryName: "Build Your Own",
    };

    cart.addItem(customItem);

    // Reset
    setSelectedBase(null);
    setSelectedMods(new Map());
    setQty(1);
    setExpanded(false);
  }

  // ── Reset state on base change ──────────────────────────────────────────

  function selectBase(base: DrinkBase) {
    setSelectedBase(base);
    setSelectedMods(new Map());
    setQty(1);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="mb-10">
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-primary/5 via-card to-accent/5 border border-primary/20 p-5 transition-all hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
              Build Your Own
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Pick a base, add your favorite modifiers, make it yours
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-6 w-6 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Builder */}
      {expanded && (
        <div className="mt-4 rounded-2xl border border-border/20 bg-card p-5 sm:p-6 animate-fade-in-scale">
          {/* Step 1: Choose Base */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              1. Choose Your Base
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DRINK_BASES.map((base) => (
                <button
                  key={base.id}
                  onClick={() => selectBase(base)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.97] ${
                    selectedBase?.id === base.id
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border/20 bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      selectedBase?.id === base.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {base.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading text-lg font-bold">{base.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{base.description}</div>
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatMoney(base.priceCents)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Add Modifiers */}
          {selectedBase && filteredLists.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                2. Customize
              </h3>
              <div className="space-y-4">
                {filteredLists.map((list) => {
                  const isSingle = list.selectionType === "single" || list.selectionType === "SINGLE" || list.maxSelectedModifiers === 1;
                  return (
                    <div key={list.providerModifierListId}>
                      <div className="mb-2 text-sm font-semibold text-foreground">
                        {list.name}
                        {isSingle && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (choose one)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {list.modifiers.map((mod) => {
                          const key = isSingle
                            ? list.providerModifierListId
                            : list.providerModifierListId + "|" + mod.providerModifierId;
                          const isActive = selectedMods.has(key);
                          return (
                            <button
                              key={mod.providerModifierId}
                              onClick={() => toggleModifier(list, mod)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                                isActive
                                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                                  : "border-border/20 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              {mod.name}
                              {mod.priceCents > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  +{formatMoney(mod.priceCents)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No modifier lists found for this base */}
          {selectedBase && filteredLists.length === 0 && (
            <div className="mb-6 rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              No customization options available for this base right now. You can still order it as-is!
            </div>
          )}

          {/* Step 3: Quantity + Add */}
          {selectedBase && (
            <div className="flex flex-col gap-4 border-t border-border/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Quantity */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/20 bg-background text-foreground hover:bg-muted active:scale-95"
                >
                  {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </button>
                <span className="w-8 text-center text-xl font-bold text-foreground">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/20 bg-background text-foreground hover:bg-muted active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Selected modifiers summary */}
              {selectedMods.size > 0 && (
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {Array.from(selectedMods.values()).map((m) => (
                    <span
                      key={m.providerModifierId}
                      className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Add Button */}
              <button
                onClick={addToCart}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Order · {formatMoney(lineTotal)}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

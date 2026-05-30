"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag, Coffee, ChevronDown, ChevronUp } from "lucide-react";
import type { PosCatalogItem, PosCatalogModifier } from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
import { useMenuCartStore, buildMenuCartItem } from "@/hooks/useMenuCart";
import { useToast } from "@/components/ui/Toast";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface MenuItemDialogProps {
  item: PosCatalogItem | null;
  onClose: () => void;
}

export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const addItem = useMenuCartStore((s) => s.addItem);
  const { toast } = useToast();
  const trapRef = useFocusTrap(!!item);

  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setSelectedVariationIndex(0);
      setSelectedModifiers({});
      setQuantity(1);
      setExpandedLists({});
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (item) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, handleKeyDown]);

  if (!item) return null;

  const currentItem = item;
  const variation = currentItem.variations[selectedVariationIndex] ?? currentItem.variations[0];
  if (!variation) return null;

  function toggleModifier(listId: string, modId: string, selectionType: string | null) {
    setSelectedModifiers((prev) => {
      const current = prev[listId] ?? [];
      if (selectionType === "single") {
        return { ...prev, [listId]: [modId] };
      }
      if (current.includes(modId)) {
        return { ...prev, [listId]: current.filter((id) => id !== modId) };
      }
      return { ...prev, [listId]: [...current, modId] };
    });
  }

  function getSelectedModifiers(): PosCatalogModifier[] {
    const mods: PosCatalogModifier[] = [];
    for (const list of currentItem.modifierLists) {
      const ids = selectedModifiers[list.providerModifierListId] ?? [];
      for (const id of ids) {
        const mod = list.modifiers.find((m) => m.providerModifierId === id);
        if (mod) mods.push(mod);
      }
    }
    return mods;
  }

  const modifierTotal = getSelectedModifiers().reduce((sum, m) => sum + m.priceCents, 0);
  const unitPrice = variation.priceCents + modifierTotal;
  const totalPrice = unitPrice * quantity;

  function handleAddToCart() {
    const cartItem = buildMenuCartItem(currentItem, variation, getSelectedModifiers(), quantity);
    addItem(cartItem);
    toast(`Added ${currentItem.name} to cart`, "cart");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Customize ${currentItem.name}`}
    >
      <div
        ref={trapRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex items-center justify-center rounded-full bg-card/90 p-2 text-mocha shadow-sm hover:text-espresso focus:outline-none focus:ring-2 focus:ring-forest"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        {currentItem.imageUrls.length > 0 ? (
          <div className="relative aspect-video overflow-hidden rounded-t-2xl">
            <Image
              src={currentItem.imageUrls[0]}
              alt={currentItem.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 32rem"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-t-2xl bg-latte/10">
            <Coffee className="h-16 w-16 text-latte" />
          </div>
        )}

        <div className="p-5 sm:p-6">
          {/* Title & Price */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-forest">
                {currentItem.categoryName}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-espresso">
                {currentItem.name}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-espresso">{formatMoney(unitPrice)}</div>
              {currentItem.variations.length > 1 && (
                <div className="text-xs text-mocha">{variation.name}</div>
              )}
            </div>
          </div>

          {currentItem.description && (
            <p className="mt-3 text-sm leading-relaxed text-mocha">{currentItem.description}</p>
          )}

          {/* Variations */}
          {currentItem.variations.length > 1 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-mocha">
                Size / Option
              </div>
              <div className="flex flex-wrap gap-2">
                {currentItem.variations.map((v, idx) => (
                  <button
                    key={v.providerVariationId}
                    onClick={() => setSelectedVariationIndex(idx)}
                    className={`rounded-xl border px-3.5 py-2 text-sm transition-all ${
                      selectedVariationIndex === idx
                        ? "border-surface bg-surface text-sand"
                        : "border-latte/30 bg-card text-espresso hover:bg-latte/20"
                    }`}
                  >
                    {v.name} <span className="opacity-80">{formatMoney(v.priceCents)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers */}
          {currentItem.modifierLists.length > 0 && (
            <div className="mt-5 space-y-4">
              {currentItem.modifierLists.map((list) => {
                const isExpanded = expandedLists[list.providerModifierListId];
                const visibleModifiers = isExpanded ? list.modifiers : list.modifiers.slice(0, 10);
                const hasMore = list.modifiers.length > 10;

                return (
                  <div key={list.providerModifierListId}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-mocha">
                      {list.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleModifiers.map((mod) => {
                        const isSelected = (
                          selectedModifiers[list.providerModifierListId] ?? []
                        ).includes(mod.providerModifierId);
                        return (
                          <button
                            key={mod.providerModifierId}
                            onClick={() =>
                              toggleModifier(
                                list.providerModifierListId,
                                mod.providerModifierId,
                                list.selectionType
                              )
                            }
                            className={`rounded-xl border px-3 py-1.5 text-sm transition-all ${
                              isSelected
                                ? "border-surface bg-surface text-sand"
                                : "border-latte/30 bg-card text-espresso hover:bg-latte/20"
                            }`}
                          >
                            {mod.name}
                            {mod.priceCents > 0 && (
                              <span className="ml-1 opacity-80">+{formatMoney(mod.priceCents)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() =>
                          setExpandedLists((prev) => ({
                            ...prev,
                            [list.providerModifierListId]: !isExpanded,
                          }))
                        }
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-forest hover:text-espresso"
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            View {list.modifiers.length - 10} more <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity & Add to Cart */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (quantity === 1) {
                    onClose();
                  } else {
                    setQuantity((q) => Math.max(1, q - 1));
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-latte bg-card text-espresso transition-colors hover:bg-latte/20"
                aria-label={quantity === 1 ? "Cancel" : "Decrease quantity"}
              >
                {quantity === 1 ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </button>
              <span className="w-8 text-center font-medium text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-latte bg-card text-espresso transition-colors hover:bg-latte/20"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              className="btn-accent flex-1 flex items-center justify-center gap-2 py-3 text-base"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Cart — {formatMoney(totalPrice)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

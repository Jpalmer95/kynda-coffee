import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PosCatalogItem, PosCatalogVariation, PosCatalogModifier } from "@/lib/pos/catalog";
import { haptic } from "@/lib/haptics";
import { backupCart } from "@/lib/idb";

export interface MenuCartItem {
  id: string;
  providerItemId: string;
  providerVariationId: string;
  itemName: string;
  variationName: string;
  quantity: number;
  modifierIds: string[];
  modifierNames: string[];
  unitPriceCents: number;
  imageUrl?: string;
  categoryName: string;
}

interface MenuCartStore {
  items: MenuCartItem[];
  item_count: number;
  subtotal_cents: number;
  addItem: (item: Omit<MenuCartItem, "id">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

function calcTotals(items: MenuCartItem[]) {
  const subtotal_cents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
  const item_count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotal_cents, item_count };
}

function lineKey(
  itemId: string,
  varId: string,
  mods: string[]
): string {
  return [itemId, varId || "", [...mods].sort().join(",")].join("|");
}

export function buildMenuCartItem(
  item: PosCatalogItem,
  variation: PosCatalogVariation,
  modifiers: PosCatalogModifier[],
  quantity: number
): Omit<MenuCartItem, "id"> {
  const modifierIds = modifiers.map((m) => m.providerModifierId);
  const unitPriceCents =
    variation.priceCents + modifiers.reduce((sum, m) => sum + m.priceCents, 0);

  return {
    providerItemId: item.providerItemId,
    providerVariationId: variation.providerVariationId,
    itemName: item.name,
    variationName: variation.name,
    quantity,
    modifierIds,
    modifierNames: modifiers.map((m) => m.name),
    unitPriceCents,
    imageUrl: item.imageUrls[0] || undefined,
    categoryName: item.categoryName,
  };
}

export const useMenuCartStore = create<MenuCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      item_count: 0,
      subtotal_cents: 0,

      addItem: (item) => {
        haptic("light");
        const id = lineKey(
          item.providerItemId,
          item.providerVariationId,
          item.modifierIds
        );
        const items = [...get().items];
        const existing = items.find((i) => i.id === id);

        if (existing) {
          existing.quantity = Math.min(20, existing.quantity + item.quantity);
        } else {
          items.push({ ...item, id });
        }

        const totals = calcTotals(items);
        set({ items, ...totals });
      },

      updateQuantity: (id, quantity) => {
        haptic("light");
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        const items = get().items.map((i) =>
          i.id === id ? { ...i, quantity: Math.min(20, quantity) } : i
        );
        const totals = calcTotals(items);
        set({ items, ...totals });
      },

      removeItem: (id) => {
        haptic("medium");
        const items = get().items.filter((i) => i.id !== id);
        const totals = calcTotals(items);
        set({ items, ...totals });
      },

      clearCart: () => {
        haptic("medium");
        set({ items: [], item_count: 0, subtotal_cents: 0 });
      },
    }),
    { name: "kynda-menu-cart" }
  )
);

// Mirror menu cart to IndexedDB for offline resilience
useMenuCartStore.subscribe((state) => {
  backupCart("menu", state.items).catch(() => {});
});

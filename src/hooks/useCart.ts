import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem, Product } from "@/types";
import { haptic } from "@/lib/haptics";

interface CartStore extends Cart {
  addItem: (product: Product, quantity?: number, variant?: CartItem["selectedVariant"]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string, discount_cents: number) => void;
  removePromo: () => void;
}

function calcTotals(items: CartItem[]) {
  const subtotal_cents = items.reduce(
    (sum, i) => sum + i.product.price_cents * i.quantity,
    0
  );
  const item_count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotal_cents, item_count };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal_cents: 0,
      item_count: 0,
      discount_cents: 0,
      promo_code: undefined,

      addItem: (product, quantity = 1, variant) => {
        haptic("light");
        const items = [...get().items];
        const existingIndex = items.findIndex(
          (i) =>
            i.product.id === product.id &&
            JSON.stringify(i.selectedVariant) === JSON.stringify(variant)
        );

        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity;
        } else {
          items.push({ product, quantity, selectedVariant: variant });
        }

        const totals = calcTotals(items);
        set({
          items,
          ...totals,
          discount_cents: 0,
          promo_code: undefined,
        });
      },

      removeItem: (productId) => {
        haptic("medium");
        const items = get().items.filter((i) => i.product.id !== productId);
        const totals = calcTotals(items);
        set({
          items,
          ...totals,
          discount_cents: 0,
          promo_code: undefined,
        });
      },

      updateQuantity: (productId, quantity) => {
        haptic("light");
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const items = get().items.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i
        );
        const totals = calcTotals(items);
        set({
          items,
          ...totals,
          discount_cents: 0,
          promo_code: undefined,
        });
      },

      clearCart: () => {
        haptic("medium");
        set({ items: [], subtotal_cents: 0, item_count: 0, discount_cents: 0, promo_code: undefined });
      },

      applyPromo: (code, discount_cents) => {
        haptic("success");
        set({ promo_code: code, discount_cents });
      },

      removePromo: () => {
        haptic("medium");
        set({ promo_code: undefined, discount_cents: 0 });
      },
    }),
    { name: "kynda-cart" }
  )
);

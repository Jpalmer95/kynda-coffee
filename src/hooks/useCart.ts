import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem, Product } from "@/types";

interface CartStore extends Cart {
  addItem: (product: Product, quantity?: number, variant?: CartItem["selectedVariant"]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal_cents: 0,
      item_count: 0,

      addItem: (product, quantity = 1, variant) => {
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

        set({
          items,
          subtotal_cents: items.reduce(
            (sum, i) => sum + i.product.price_cents * i.quantity,
            0
          ),
          item_count: items.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      removeItem: (productId) => {
        const items = get().items.filter((i) => i.product.id !== productId);
        set({
          items,
          subtotal_cents: items.reduce(
            (sum, i) => sum + i.product.price_cents * i.quantity,
            0
          ),
          item_count: items.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const items = get().items.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i
        );
        set({
          items,
          subtotal_cents: items.reduce(
            (sum, i) => sum + i.product.price_cents * i.quantity,
            0
          ),
          item_count: items.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      clearCart: () => set({ items: [], subtotal_cents: 0, item_count: 0 }),
    }),
    { name: "kynda-cart" }
  )
);

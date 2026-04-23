import { create } from "zustand";
import { persist } from "zustand/middleware";
import { haptic } from "@/lib/haptics";

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id: string) => {
        haptic("light");
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((i) => i !== id)
            : [...state.ids, id],
        }));
      },
      isFavorite: (id: string) => get().ids.includes(id),
    }),
    { name: "kynda-favorites" }
  )
);

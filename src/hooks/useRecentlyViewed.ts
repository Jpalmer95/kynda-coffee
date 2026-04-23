"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/types";

const STORAGE_KEY = "kynda_recently_viewed";
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const [recent, setRecent] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const add = useCallback((product: Product) => {
    setRecent((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recent, add, clear };
}

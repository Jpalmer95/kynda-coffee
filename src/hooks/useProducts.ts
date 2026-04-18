"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";

export function useProducts(filters?: {
  category?: string;
  featured?: boolean;
  limit?: number;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.featured) params.set("featured", "true");
    if (filters?.limit) params.set("limit", String(filters.limit));

    fetch(`/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [filters?.category, filters?.featured, filters?.limit]);

  return { products, loading, error };
}

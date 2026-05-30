/**
 * MenuMetrics client (Roadmap V2 — Epic 7). Admin-backend only.
 *
 * Typed wrapper over the MenuMetrics API (Express+Drizzle+PG app at
 * MENU_METRICS_URL). MenuMetrics owns gram-level recipe/ingredient costing,
 * densities, and waste factors; Kynda automates USING it. See
 * docs/menumetrics-integration.md — REST paths marked there as ‹verify› must be
 * confirmed against the running instance; they are centralized here so that's a
 * one-file change.
 *
 * Graceful by design: when MENU_METRICS_URL is unset the client reports
 * not-configured and callers fall back to cached values. Nothing throws on a
 * cold/offline MenuMetrics.
 */

export interface MenuMetricsRecipeCost {
  id: string;
  name: string;
  yield_servings: number;
  cost_per_serving_cents: number;
  ingredient_cost_cents: number;
  updated_at: string;
}

export interface MenuMetricsIngredient {
  id: string;
  name: string;
  vendor: string | null;
  pack_size: string | null;
  cost_cents: number;
  unit: string;
  density_g_per_ml: number | null;
  updated_at: string;
}

export interface MenuMetricsStock {
  ingredient_id: string;
  name: string;
  on_hand: number;
  unit: string;
  reorder_threshold: number | null;
  updated_at: string;
}

function baseUrl(): string | null {
  const url = process.env.MENU_METRICS_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export function isMenuMetricsConfigured(): boolean {
  return Boolean(baseUrl());
}

async function mmFetch<T>(path: string): Promise<T | null> {
  const base = baseUrl();
  if (!base) return null;
  const token = process.env.MENU_METRICS_TOKEN;
  try {
    const res = await fetch(`${base}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // server-to-server; no caching of credentials
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[menumetrics] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[menumetrics] ${path} failed:`, String(err));
    return null;
  }
}

// ‹verify› REST paths against the running MenuMetrics server/ routes.
export async function fetchRecipeCost(recipeId: string): Promise<MenuMetricsRecipeCost | null> {
  return mmFetch<MenuMetricsRecipeCost>(`/api/recipes/${encodeURIComponent(recipeId)}`);
}

export async function fetchRecipes(): Promise<MenuMetricsRecipeCost[]> {
  return (await mmFetch<MenuMetricsRecipeCost[]>(`/api/recipes`)) ?? [];
}

export async function fetchIngredients(): Promise<MenuMetricsIngredient[]> {
  return (await mmFetch<MenuMetricsIngredient[]>(`/api/ingredients`)) ?? [];
}

export async function fetchStock(): Promise<MenuMetricsStock[]> {
  return (await mmFetch<MenuMetricsStock[]>(`/api/inventory`)) ?? [];
}

/**
 * MenuMetrics client (Roadmap V2 — Epic 7). Admin-backend only.
 *
 * Typed wrapper over the MenuMetrics Agent Bridge (token-protected API at
 * MENU_METRICS_URL/api/agent/*). MenuMetrics owns gram-level recipe/ingredient
 * costing, densities, and waste factors; Kynda automates USING it. See
 * docs/menumetrics-integration.md.
 *
 * Bridge paths VERIFIED live 2026-06-10 against the running instance:
 *   GET  /api/agent/health        — liveness + tenant check
 *   GET  /api/agent/recipes       — all recipes w/ computed costs
 *   GET  /api/agent/recipes/:id   — one recipe + price recommendation
 *   GET  /api/agent/ingredients   — ingredients w/ vendor + pack cost
 *   GET  /api/agent/stock         — on-hand levels + reorder thresholds
 *   POST /api/agent/ingredients   — create ingredient (agent-tagged)
 *   POST /api/agent/recipes       — create recipe + lines, returns cost+pricing
 *
 * Auth: X-Agent-Token: MENU_METRICS_TOKEN (the bridge also accepts Bearer).
 *
 * Graceful by design: when MENU_METRICS_URL is unset the client reports
 * not-configured and callers fall back to cached values. Nothing throws on a
 * cold/offline MenuMetrics.
 */

export interface MenuMetricsRecipeCost {
  id: string;
  name: string;
  category?: string;
  yield_servings: number;
  cost_per_serving_cents: number;
  ingredient_cost_cents: number;
  menu_price_cents?: number | null;
  target_margin_pct?: number;
  updated_at: string;
}

export interface MenuMetricsRecipeDetail extends MenuMetricsRecipeCost {
  pricing?: {
    suggested_price_cents: number;
    food_cost_pct_at_suggested: number;
  };
  ingredients?: Array<{
    ingredient_id: string;
    name?: string;
    quantity: number;
    unit: string;
  }>;
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

export interface CreateIngredientInput {
  name: string;
  category?: string;
  store?: string;
  purchase_quantity: number;
  purchase_unit: string; // "g", "grams", "lb", "ml", "each", ...
  purchase_cost_cents: number;
  grams_per_milliliter?: number;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  category?: string; // tolerant: "beverage"/"coffee" map to "drink", etc.
  servings?: number;
  target_margin_pct?: number;
  ingredients?: Array<{ ingredient_id: string; quantity: number; unit: string }>;
}

function baseUrl(): string | null {
  const url = process.env.MENU_METRICS_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export function isMenuMetricsConfigured(): boolean {
  return Boolean(baseUrl()) && Boolean(process.env.MENU_METRICS_TOKEN);
}

async function mmFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = baseUrl();
  if (!base) return null;
  const token = process.env.MENU_METRICS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "X-Agent-Token": token,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
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

// ── Reads ────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ ok: boolean; tenant_resolved: boolean } | null> {
  return mmFetch(`/api/agent/health`);
}

export async function fetchRecipeCost(recipeId: string): Promise<MenuMetricsRecipeDetail | null> {
  return mmFetch<MenuMetricsRecipeDetail>(`/api/agent/recipes/${encodeURIComponent(recipeId)}`);
}

export async function fetchRecipes(): Promise<MenuMetricsRecipeCost[]> {
  return (await mmFetch<MenuMetricsRecipeCost[]>(`/api/agent/recipes`)) ?? [];
}

export async function fetchIngredients(): Promise<MenuMetricsIngredient[]> {
  return (await mmFetch<MenuMetricsIngredient[]>(`/api/agent/ingredients`)) ?? [];
}

export async function fetchStock(): Promise<MenuMetricsStock[]> {
  return (await mmFetch<MenuMetricsStock[]>(`/api/agent/stock`)) ?? [];
}

// ── Writes (agent-native recipe/ingredient proposals) ───────────────────

export async function createIngredient(
  input: CreateIngredientInput
): Promise<{ id: string; name: string } | null> {
  return mmFetch(`/api/agent/ingredients`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Create an agent-proposed recipe in MenuMetrics. Returns the computed
 * fully-loaded cost AND a suggested menu price at the target margin — this is
 * the core of the "agent recommends a menu item, MenuMetrics costs it" flow.
 */
export async function createRecipe(input: CreateRecipeInput): Promise<MenuMetricsRecipeDetail | null> {
  return mmFetch(`/api/agent/recipes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

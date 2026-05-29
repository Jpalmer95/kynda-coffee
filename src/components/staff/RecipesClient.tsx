"use client";

import { useState, useMemo } from "react";
import { Coffee, Search, Clock, Users, ChevronRight } from "lucide-react";

export interface Recipe {
  id: string;
  name: string;
  category: "espresso" | "cold-brew" | "tea" | "smoothie" | "food" | "pastry" | "seasonal";
  ingredients: { name: string; amount: string; unit?: string }[];
  steps: { order: number; instruction: string }[];
  prep_time_minutes: number;
  servings: number;
  notes?: string;
  image_url?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  all: { label: "All", emoji: "📋" },
  espresso: { label: "Espresso", emoji: "☕" },
  "cold-brew": { label: "Cold Brew", emoji: "🧊" },
  tea: { label: "Tea", emoji: "🍵" },
  smoothie: { label: "Smoothie", emoji: "🥤" },
  food: { label: "Food", emoji: "🥪" },
  pastry: { label: "Pastry", emoji: "🥐" },
  seasonal: { label: "Seasonal", emoji: "🍂" },
};

interface RecipesClientProps {
  recipes: Recipe[];
}

export function RecipesClient({ recipes }: RecipesClientProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [recipes, categoryFilter, search]);

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-latte/30 bg-card pl-11 pr-4 py-3 text-espresso placeholder:text-mocha/50"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {Object.entries(CATEGORY_LABELS).map(([id, cat]) => (
            <button
              key={id}
              onClick={() => setCategoryFilter(id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                categoryFilter === id
                  ? "bg-forest text-sand"
                  : "bg-card text-espresso border border-latte/30 hover:border-forest/50"
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="group flex flex-col rounded-xl border border-latte/20 bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mocha">
                  {CATEGORY_LABELS[recipe.category]?.emoji} {recipe.category}
                </span>
                <h3 className="mt-2 font-heading text-lg font-bold text-espresso group-hover:text-forest">
                  {recipe.name}
                </h3>
              </div>
              <ChevronRight className="h-5 w-5 text-mocha group-hover:text-forest shrink-0" />
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-mocha">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {recipe.prep_time_minutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
              </span>
              <span>{recipe.ingredients.length} ingredients</span>
            </div>

            {recipe.notes && (
              <p className="mt-2 text-xs text-mocha line-clamp-2">{recipe.notes}</p>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-latte/40 p-12 text-center">
          <Coffee className="mx-auto h-10 w-10 text-mocha/40" />
          <p className="mt-3 text-mocha">No recipes match your search.</p>
        </div>
      )}

      {/* Recipe detail modal */}
      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}

function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [servings, setServings] = useState(recipe.servings);
  const scale = servings / recipe.servings;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="inline-block rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
              {CATEGORY_LABELS[recipe.category]?.emoji} {recipe.category}
            </span>
            <h2 className="mt-2 font-heading text-2xl font-bold text-espresso">
              {recipe.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-mocha hover:bg-card hover:text-espresso"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scaling */}
        <div className="mb-5 flex items-center gap-3 rounded-lg bg-card p-3">
          <span className="text-sm text-mocha">Servings:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="h-7 w-7 rounded-md bg-background border border-latte/30 font-bold"
            >
              −
            </button>
            <span className="min-w-[2ch] text-center font-heading text-xl font-bold text-espresso">
              {servings}
            </span>
            <button
              onClick={() => setServings(servings + 1)}
              className="h-7 w-7 rounded-md bg-background border border-latte/30 font-bold"
            >
              +
            </button>
          </div>
          {scale !== 1 && (
            <span className="text-xs text-forest font-medium">
              ({scale}x scaled)
            </span>
          )}
        </div>

        {/* Ingredients */}
        <div className="mb-6">
          <h3 className="mb-3 font-heading text-lg font-bold text-espresso">
            Ingredients
          </h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg bg-card p-3 text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest font-bold text-xs">
                  {i + 1}
                </span>
                <span className="text-espresso flex-1">{ing.name}</span>
                <span className="font-bold text-forest">
                  {parseFloat(ing.amount)
                    ? `${(parseFloat(ing.amount) * scale).toFixed(ing.unit === "oz" || ing.unit === "g" ? 1 : 2)} ${ing.unit || ""}`
                    : ing.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="mb-6">
          <h3 className="mb-3 font-heading text-lg font-bold text-espresso">
            Steps
          </h3>
          <ol className="space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.order} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-sand font-bold text-xs">
                  {step.order}
                </span>
                <p className="text-espresso pt-0.5 flex-1">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>

        {recipe.notes && (
          <div className="rounded-lg border-l-4 border-forest bg-card p-4">
            <p className="text-sm text-espresso">
              <strong>Note:</strong> {recipe.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

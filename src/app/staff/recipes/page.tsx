import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Coffee } from "lucide-react";
import { RecipesClient, type Recipe } from "@/components/staff/RecipesClient";

export const dynamic = "force-dynamic";

// Recipes are loaded from the production `recipes` table (seeded from the
// canonical _PLATFORM/recipes set). No filler fallback data.
const SEED_RECIPES: Recipe[] = [];

export default async function StaffRecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  // Try to fetch from database, fall back to seed data
  let recipes: Recipe[] = SEED_RECIPES;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("category")
      .order("name");

    if (!error && data && data.length > 0) {
      recipes = data as Recipe[];
    }
  } catch {
    // Use seed data
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-forest">
          <Coffee className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">
            Staff Resources
          </span>
        </div>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">
          Recipes
        </h1>
        <p className="mt-2 text-mocha">
          Drink and food preparation guides. Click any recipe to view ingredients and steps.
        </p>
      </div>

      <RecipesClient recipes={recipes} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Coffee } from "lucide-react";
import { RecipesClient, type Recipe } from "@/components/staff/RecipesClient";

export const dynamic = "force-dynamic";

// Seed recipes (used when database table doesn't exist yet)
const SEED_RECIPES: Recipe[] = [
  {
    id: "latte",
    name: "Classic Latte",
    category: "espresso",
    prep_time_minutes: 4,
    servings: 1,
    notes: "Standard hot latte with 2% milk. Can substitute any milk preference.",
    ingredients: [
      { name: "Espresso shot", amount: "2", unit: "shots" },
      { name: "Steamed milk", amount: "8", unit: "oz" },
      { name: "Milk foam", amount: "0.5", unit: "inch" },
    ],
    steps: [
      { order: 1, instruction: "Pull double espresso shot into cup" },
      { order: 2, instruction: "Steam milk to 150°F with microfoam texture" },
      { order: 3, instruction: "Pour steamed milk over espresso" },
      { order: 4, instruction: "Top with 0.5 inch of foam" },
      { order: 5, instruction: "Optional: add latte art" },
    ],
  },
  {
    id: "cold-brew",
    name: "House Cold Brew",
    category: "cold-brew",
    prep_time_minutes: 1,
    servings: 1,
    notes: "Cold brew is pre-brewed. Serve over ice.",
    ingredients: [
      { name: "Cold brew concentrate", amount: "6", unit: "oz" },
      { name: "Water", amount: "4", unit: "oz" },
      { name: "Ice", amount: "1", unit: "cup" },
    ],
    steps: [
      { order: 1, instruction: "Fill cup with ice" },
      { order: 2, instruction: "Pour cold brew concentrate" },
      { order: 3, instruction: "Add water to dilute" },
      { order: 4, instruction: "Stir and serve" },
    ],
  },
  {
    id: "mocha",
    name: "Café Mocha",
    category: "espresso",
    prep_time_minutes: 5,
    servings: 1,
    notes: "Chocolate + espresso + steamed milk",
    ingredients: [
      { name: "Espresso shot", amount: "2", unit: "shots" },
      { name: "Chocolate syrup", amount: "1.5", unit: "oz" },
      { name: "Steamed milk", amount: "8", unit: "oz" },
      { name: "Whipped cream", amount: "1", unit: "dollop" },
    ],
    steps: [
      { order: 1, instruction: "Add chocolate syrup to cup" },
      { order: 2, instruction: "Pull double espresso shot" },
      { order: 3, instruction: "Stir espresso and chocolate together" },
      { order: 4, instruction: "Steam and pour milk" },
      { order: 5, instruction: "Top with whipped cream" },
    ],
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    category: "tea",
    prep_time_minutes: 4,
    servings: 1,
    notes: "Traditional Japanese tea latte",
    ingredients: [
      { name: "Matcha powder", amount: "2", unit: "tsp" },
      { name: "Hot water", amount: "2", unit: "oz" },
      { name: "Steamed milk", amount: "8", unit: "oz" },
    ],
    steps: [
      { order: 1, instruction: "Sift matcha powder into cup" },
      { order: 2, instruction: "Add hot water (175°F)" },
      { order: 3, instruction: "Whisk until smooth and frothy" },
      { order: 4, instruction: "Steam milk" },
      { order: 5, instruction: "Pour milk over matcha" },
    ],
  },
  {
    id: "smoothie-berry",
    name: "Berry Blast Smoothie",
    category: "smoothie",
    prep_time_minutes: 3,
    servings: 1,
    notes: "Fresh berry smoothie with protein",
    ingredients: [
      { name: "Mixed berries (frozen)", amount: "1", unit: "cup" },
      { name: "Banana", amount: "1", unit: "whole" },
      { name: "Greek yogurt", amount: "0.5", unit: "cup" },
      { name: "Almond milk", amount: "0.75", unit: "cup" },
      { name: "Protein powder", amount: "1", unit: "scoop" },
    ],
    steps: [
      { order: 1, instruction: "Add all ingredients to blender" },
      { order: 2, instruction: "Blend on high for 45 seconds" },
      { order: 3, instruction: "Pour into cup" },
      { order: 4, instruction: "Add straw and serve" },
    ],
  },
  {
    id: "avocado-toast",
    name: "Avocado Toast",
    category: "food",
    prep_time_minutes: 5,
    servings: 1,
    notes: "Sourdough with smashed avocado and toppings",
    ingredients: [
      { name: "Sourdough bread", amount: "2", unit: "slices" },
      { name: "Avocado", amount: "1", unit: "half" },
      { name: "Lemon juice", amount: "1", unit: "tsp" },
      { name: "Red pepper flakes", amount: "0.25", unit: "tsp" },
      { name: "Salt", amount: "1", unit: "pinch" },
    ],
    steps: [
      { order: 1, instruction: "Toast sourdough slices" },
      { order: 2, instruction: "Mash avocado with lemon juice and salt" },
      { order: 3, instruction: "Spread avocado on toast" },
      { order: 4, instruction: "Sprinkle with red pepper flakes" },
      { order: 5, instruction: "Serve immediately" },
    ],
  },
  {
    id: "pumpkin-spice-latte",
    name: "Pumpkin Spice Latte",
    category: "seasonal",
    prep_time_minutes: 5,
    servings: 1,
    notes: "Fall seasonal favorite",
    ingredients: [
      { name: "Espresso shot", amount: "2", unit: "shots" },
      { name: "Pumpkin spice syrup", amount: "1.5", unit: "oz" },
      { name: "Steamed milk", amount: "8", unit: "oz" },
      { name: "Whipped cream", amount: "1", unit: "dollop" },
      { name: "Pumpkin spice topping", amount: "1", unit: "sprinkle" },
    ],
    steps: [
      { order: 1, instruction: "Add pumpkin spice syrup to cup" },
      { order: 2, instruction: "Pull double espresso shot" },
      { order: 3, instruction: "Stir espresso and syrup" },
      { order: 4, instruction: "Steam and pour milk" },
      { order: 5, instruction: "Top with whipped cream and pumpkin spice" },
    ],
  },
];

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

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { WasteLogClient } from "@/components/staff/WasteLogClient";

export const dynamic = "force-dynamic";

// Seed product options (used when database table doesn't exist)
const SEED_PRODUCTS = [
  { id: "milk-2", name: "2% Milk", cost_cents: 50, unit: "oz" },
  { id: "milk-whole", name: "Whole Milk", cost_cents: 55, unit: "oz" },
  { id: "milk-oat", name: "Oat Milk", cost_cents: 120, unit: "oz" },
  { id: "milk-almond", name: "Almond Milk", cost_cents: 110, unit: "oz" },
  { id: "espresso-beans", name: "Espresso Beans", cost_cents: 800, unit: "lb" },
  { id: "pastry-croissant", name: "Croissant", cost_cents: 250, unit: "each" },
  { id: "pastry-muffin", name: "Muffin", cost_cents: 300, unit: "each" },
  { id: "fruit-banana", name: "Banana", cost_cents: 25, unit: "each" },
  { id: "fruit-berry", name: "Mixed Berries", cost_cents: 400, unit: "lb" },
  { id: "syrup-vanilla", name: "Vanilla Syrup", cost_cents: 650, unit: "bottle" },
];

export default async function StaffWasteLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  // Fetch waste entries
  let entries: any[] = [];
  try {
    const { data, error } = await supabase
      .from("waste_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      entries = data;
    }
  } catch {
    // Table may not exist yet
  }

  // Fetch product options for dropdown — prefer HEB exact names + real costs
  // from ingredient_pars, fall back to POS products.
  let productOptions = SEED_PRODUCTS;
  try {
    const { data: pars, error: parsErr } = await supabase
      .from("ingredient_pars")
      .select("id, ingredient_name, unit_cost_cents, unit")
      .eq("is_active", true)
      .order("ingredient_name")
      .limit(200);

    if (!parsErr && pars && pars.length > 0) {
      productOptions = pars.map((p) => ({
        id: p.id,
        name: p.ingredient_name,
        cost_cents: p.unit_cost_cents ?? 0,
        unit: p.unit ?? "each",
        is_ingredient: true,
      }));
    } else {
      // Fall back to POS products
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_cents")
        .eq("is_active", true)
        .limit(50);
      if (!error && data && data.length > 0) {
        productOptions = data.map((p) => ({
          id: p.id,
          name: p.name,
          cost_cents: Math.round(p.price_cents * 0.3),
          unit: "each",
          is_ingredient: false,
        }));
      }
    }
  } catch {
    // Use seed products
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-600">
          <Trash2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">
            Waste Tracking
          </span>
        </div>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">
          Waste Log
        </h1>
        <p className="mt-2 text-mocha">
          Record damaged, expired, or wasted items to help us track and reduce losses.
        </p>
      </div>

      <WasteLogClient initialEntries={entries} productOptions={productOptions} />
    </div>
  );
}

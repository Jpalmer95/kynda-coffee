import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  ClipboardList,
} from "lucide-react";
import { ChecklistClient } from "@/components/staff/ChecklistClient";

export const dynamic = "force-dynamic";

// Seed checklists (used when database table doesn't exist)
export const SEED_OPENING = [
  "Turn on espresso machine — let warm up 20 min",
  "Grind espresso beans — dial in shots",
  "Brew drip coffee (regular + decaf)",
  "Prepare pastry display case",
  "Stock cups, lids, napkins, stirrers",
  "Fill condiment bar (sugar, cream, cinnamon)",
  "Wipe down all counter surfaces",
  "Check refrigerated items — discard expired",
  "Set up POS — log in, check cash drawer",
  "Turn on background music",
];

export const SEED_CLOSING = [
  "Run cleaning cycle on espresso machine",
  "Empty and sanitize grinder",
  "Wash all equipment and utensils",
  "Wipe down espresso machine group heads",
  "Empty drip trays and rinse",
  "Restock cups, lids, and supplies for tomorrow",
  "Clean pastry display case",
  "Wipe down all tables and chairs",
  "Sweep and mop floors",
  "Empty trash and replace liners",
  "Count cash drawer — record on close sheet",
  "Turn off equipment, lights, and music",
  "Lock all doors — set alarm",
];

export const SEED_MIDSHIFT = [
  "Restock supplies as needed",
  "Wipe down tables and condiment bar",
  "Check fridge temps",
  "Refill coffee as needed",
  "Quick sweep of visible floor areas",
];

export default async function StaffChecklistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const todayISO = new Date().toISOString().split("T")[0];

  // Fetch today's completions by this user
  let completedItems: string[] = [];
  try {
    const { data } = await supabase
      .from("checklist_completions")
      .select("checklist_type, completed_items")
      .eq("completed_by", user.id)
      .gte("completed_at", `${todayISO}T00:00:00`);

    if (data) {
      completedItems = data.flatMap((c) =>
        c.completed_items ? c.completed_items.map((i: any) => `${c.checklist_type}:${i}`) : []
      );
    }
  } catch {
    // Table may not exist
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-forest">
          <ClipboardList className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">
            Daily Tasks
          </span>
        </div>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">
          Checklists
        </h1>
        <p className="mt-2 text-mocha">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <ChecklistClient completedItems={completedItems} username={user.id} />
    </div>
  );
}

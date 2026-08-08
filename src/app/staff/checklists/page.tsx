import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { ChecklistClient } from "@/components/staff/ChecklistClient";

export const dynamic = "force-dynamic";

export default async function StaffChecklistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  // Fetch checklists from DB (migration 044 seeds opening/closing/mid-shift)
  let checklists: any[] = [];
  let error = null;
  try {
    const { data, error: clError } = await supabase
      .from("checklists")
      .select("id, title, description, type, items")
      .order("type");
    if (clError) {
      error = clError.message;
    } else {
      checklists = (data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        items: Array.isArray(c.items) ? c.items : [],
      }));
    }
  } catch (e: any) {
    error = e.message;
  }

  // Fetch today's completions by this user
  const todayISO = new Date().toISOString().split("T")[0];
  let completedByType: Record<string, number[]> = {};
  try {
    const { data } = await supabase
      .from("checklist_completions")
      .select("checklist_type, completed_items, completed_at")
      .eq("completed_by", user.id)
      .gte("completed_at", `${todayISO}T00:00:00`);

    if (data) {
      for (const c of data) {
        const items = Array.isArray(c.completed_items) ? c.completed_items : [];
        if (!completedByType[c.checklist_type] || items.length >= (completedByType[c.checklist_type]?.length ?? 0)) {
          completedByType[c.checklist_type] = items;
        }
      }
    }
  } catch {
    // Table may not exist yet
  }

  // Get the user's name for the completion banner
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const displayName = (profile as any)?.full_name || (profile as any)?.email?.split("@")[0] || "Team Member";

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
          {" — "}<span className="font-medium text-espresso">{displayName}</span>
        </p>
      </div>

      {error && checklists.length === 0 ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load checklists: {error}
        </div>
      ) : null}

      <ChecklistClient
        checklists={checklists}
        completedByType={completedByType}
        username={user.id}
        displayName={displayName}
      />
    </div>
  );
}

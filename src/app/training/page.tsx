import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { normalizeRole, isTeamMember } from "@/lib/auth/roles";
import TrainingModulesClient from "@/components/staff/TrainingModulesClient";
import { TrainingWrapper } from "@/app/training/TrainingWrapper";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Training | Kynda Coffee",
};

interface TrainingModule {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  order_index: number;
  is_required: boolean;
  updated_at: string;
}

export default async function TrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !isTeamMember(normalizeRole(profile.role))) {
    redirect("/");
  }

  // Training modules are the single source (admin-managed in /admin/training).
  let modules: TrainingModule[] = [];
  let completedMap: Record<string, string> = {};
  try {
    const [modsRes, compRes] = await Promise.all([
      supabase
        .from("training_modules")
        .select("id, title, description, category, content, order_index, is_required, updated_at")
        .order("category", { ascending: true })
        .order("order_index", { ascending: true }),
      supabase
        .from("training_completions")
        .select("module_id, completed_at")
        .eq("user_id", user.id),
    ]);
    if (!modsRes.error) modules = (modsRes.data ?? []) as TrainingModule[];
    if (!compRes.error) {
      for (const c of compRes.data ?? []) completedMap[c.module_id] = c.completed_at;
    }
  } catch {
    // fall through with empty state
  }

  return (
    <TrainingWrapper>
      <section className="section-padding">
        <div className="container-max">
          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-forest" />
            <div>
              <h1 className="font-heading text-3xl font-bold text-espresso">
                Team Training
              </h1>
              <p className="text-sm text-mocha">
                Welcome, {profile.full_name || "Team Member"} — work through the
                required modules and track your progress.
              </p>
            </div>
            {(normalizeRole(profile.role) === "owner" || normalizeRole(profile.role) === "manager") && (
              <Link
                href="/admin/training"
                className="ml-auto text-sm font-medium text-forest hover:underline"
              >
                Admin View →
              </Link>
            )}
          </div>

          <TrainingModulesClient initialModules={modules} initialCompleted={completedMap} />
        </div>
      </section>
    </TrainingWrapper>
  );
}

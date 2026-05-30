import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Coffee,
  ClipboardList,
  Trash2,
  FileText,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Staff dashboard — overview with quick actions and today's stats
 */
export default async function StaffDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  // Fetch employee name + today's stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const todayISO = new Date().toISOString().split("T")[0];

  // Training module progress
  let modulesCompleted = 0;
  let totalModules = 0;
  try {
    const { data: courses } = await supabase
      .from("courses")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    if (courses?.[0]) {
      const { count } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courses[0].id);
      totalModules = count || 0;

      const { data: progress } = await supabase
        .from("module_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_complete", true);
      modulesCompleted = progress?.length || 0;
    }
  } catch {
    // Training tables may not exist
  }

  // Today's waste entries
  let wasteEntryCount = 0;
  try {
    const { data: waste } = await supabase
      .from("waste_entries")
      .select("id")
      .eq("created_at::date", todayISO);
    wasteEntryCount = waste?.length || 0;
  } catch {
    // waste_entries table may not exist yet
  }

  // Today's checklist completions
  let checklistsDoneToday = 0;
  try {
    const { data: checks } = await supabase
      .from("checklist_completions")
      .select("id")
      .eq("completed_by", user.id)
      .gte("completed_at", `${todayISO}T00:00:00`);
    checklistsDoneToday = checks?.length || 0;
  } catch {
    // checklist_completions table may not exist yet
  }

  const quickLinks = [
    {
      href: "/staff/recipes",
      icon: Coffee,
      title: "Recipes",
      desc: "Drink & food preparation guides",
      color: "bg-bronze text-sand",
    },
    {
      href: "/staff/checklists",
      icon: ClipboardList,
      title: "Checklists",
      desc: "Opening, closing, and shift tasks",
      color: "bg-forest text-sand",
    },
    {
      href: "/staff/waste-log",
      icon: Trash2,
      title: "Log Waste",
      desc: "Record damaged or expired items",
      color: "bg-red-600 text-white",
    },
    {
      href: "/staff/handbook",
      icon: FileText,
      title: "Handbook",
      desc: "Policies, procedures, and guidelines",
      color: "bg-purple-600 text-white",
    },
    {
      href: "/training",
      icon: GraduationCap,
      title: "Training",
      desc: "Courses and modules",
      color: "bg-blue-600 text-white",
    },
    {
      href: "/staff/onboarding",
      icon: FileText,
      title: "Onboarding Hub",
      desc: "New-hire forms (I-9, W-4), handbook & training packet",
      color: "bg-amber-600 text-white",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      {/* Greeting */}
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-forest">
          Staff Portal
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">
          Welcome back, {(profile as any)?.full_name?.split(" ")[0] || "there"} ☕
        </h1>
        <p className="mt-2 text-mocha">
          Here&apos;s what&apos;s happening at Kynda Coffee today.
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={BookOpen}
          label="Training Modules"
          value={`${modulesCompleted}/${totalModules}`}
          hint={
            totalModules > 0
              ? `${Math.round((modulesCompleted / totalModules) * 100)}% complete`
              : "No modules yet"
          }
        />
        <StatsCard
          icon={ClipboardList}
          label="Checklists Today"
          value={checklistsDoneToday.toString()}
          hint="Opening / closing / shift"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Waste Entries Today"
          value={wasteEntryCount.toString()}
          hint="Track losses for accountability"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-10">
        <h2 className="mb-4 font-heading text-2xl font-bold text-espresso">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-4 rounded-xl border border-latte/20 bg-card p-5 transition hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-md"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
                <link.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-espresso group-hover:text-forest">
                  {link.title}
                </h3>
                <p className="mt-1 text-sm text-mocha line-clamp-2">
                  {link.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pro tips */}
      <div className="rounded-xl border border-dashed border-forest/30 bg-forest/5 p-6">
        <h3 className="font-heading text-lg font-bold text-espresso mb-3">
          Barista Tips
        </h3>
        <ul className="space-y-2 text-sm text-mocha">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
            Log every waste entry — even small spills. It helps us track and reduce losses.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
            Complete your opening checklist before serving the first customer.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
            Review the recipes page for new seasonal drinks — they rotate monthly.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
            If something feels off with equipment, report it via waste log with reason &quot;damaged&quot;.
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-latte/20 bg-card p-5">
      <div className="flex items-center gap-2 text-mocha">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-2 font-heading text-3xl font-bold text-espresso">
        {value}
      </div>
      <div className="mt-1 text-xs text-mocha">{hint}</div>
    </div>
  );
}

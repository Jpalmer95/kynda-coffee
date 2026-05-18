import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  BookOpen,
  Clock,
  Award,
} from "lucide-react";

export default async function AdminTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  let employees: any[] | null = null;
  let courses: any[] | null = null;
  let moduleProgress: any[] | null = null;
  let completions: any[] | null = null;
  let totalModules = 0;
  let tablesExist = false;

  try {
    // Check if tables exist by doing a safe query
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileErr && profileErr.message?.includes("does not exist")) {
      // Tables are missing - tablesExist stays false
    } else if (profileErr) {
      redirect("/account");
    } else if ((profile as any)?.role !== "admin") {
      redirect("/account");
    }

    const { data: empData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee")
      .order("created_at", { ascending: false });
    employees = empData;

    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .eq("is_active", true)
      .limit(1);
    courses = courseData;

    if (courses?.[0]) {
      const { count } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courses[0].id);
      totalModules = count || 0;
    }

    const { data: progData } = await supabase
      .from("module_progress")
      .select("user_id, is_complete, completed_at, updated_at");
    moduleProgress = progData;

    const { data: compData } = await supabase
      .from("course_completions")
      .select("user_id, completed_at");
    completions = compData;

    tablesExist = true;
  } catch (e) {
    tablesExist = false;
  }

  if (!tablesExist) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <GraduationCap className="mx-auto h-16 w-16 text-mocha/40" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-espresso">
            Training Coming Soon
          </h1>
          <p className="mt-2 text-mocha">
            The training modules database is being set up.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-block text-forest hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </section>
    );
  }

  const completionMap = new Map(
    completions?.map((c) => [c.user_id, c.completed_at]) || []
  );

  const employeeProgress = employees?.map((emp) => {
    const userProgress =
      moduleProgress?.filter((p) => p.user_id === emp.id) || [];
    const completedModules = userProgress.filter((p) => p.is_complete).length;
    const lastActivity = userProgress.reduce<string | null>((latest, p) => {
      if (!latest || p.updated_at > latest) return p.updated_at;
      return latest;
    }, null);

    return {
      id: emp.id,
      full_name: emp.full_name,
      modules_completed: completedModules,
      total_modules: totalModules,
      is_course_complete: completionMap.has(emp.id),
      completion_date: completionMap.get(emp.id) || null,
      last_activity: lastActivity,
      created_at: emp.created_at,
    };
  });

  const completedCount =
    employeeProgress?.filter((e) => e.is_course_complete).length || 0;
  const inProgressCount =
    employeeProgress?.filter(
      (e) => !e.is_course_complete && e.modules_completed > 0
    ).length || 0;

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-espresso" />
            <div>
              <h1 className="font-heading text-3xl font-bold text-espresso">
                Training Admin
              </h1>
              <p className="text-sm text-mocha">
                Employee training progress tracker
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-sm font-medium text-forest hover:underline"
          >
            ← Admin Home
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Employees" value={employeeProgress?.length || 0} />
          <StatCard icon={Award} label="Completed" value={completedCount} highlight />
          <StatCard icon={BookOpen} label="In Progress" value={inProgressCount} />
          <StatCard icon={CheckCircle2} label="Total Modules" value={totalModules} />
        </div>

        <div className="overflow-hidden rounded-xl border border-latte/20 bg-card">
          <div className="border-b border-latte/20 p-6">
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Employee Progress
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-latte/10 bg-latte/5">
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-mocha">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-mocha">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-mocha">
                    Modules
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-mocha">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-mocha">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-mocha">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {employeeProgress?.map((emp) => {
                  const pct =
                    totalModules > 0
                      ? Math.round((emp.modules_completed / totalModules) * 100)
                      : 0;

                  return (
                    <tr
                      key={emp.id}
                      className="border-b border-latte/5 hover:bg-latte/5"
                    >
                      <td className="px-6 py-4 font-medium text-espresso">
                        {emp.full_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-latte/20">
                            <div
                              className={`h-2 rounded-full ${
                                emp.is_course_complete
                                  ? "bg-green-500"
                                  : "bg-bronze"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-mocha">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-mocha">
                        {emp.modules_completed}/{emp.total_modules}
                      </td>
                      <td className="px-6 py-4">
                        {emp.is_course_complete ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </span>
                        ) : emp.modules_completed > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                            <BookOpen className="h-3 w-3" /> In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-latte/10 px-2 py-1 text-xs font-semibold text-mocha/60">
                            <Clock className="h-3 w-3" /> Not Started
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-mocha">
                        {emp.last_activity
                          ? new Date(emp.last_activity).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-mocha">
                        {new Date(emp.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {(!employeeProgress || employeeProgress.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-mocha/60"
                    >
                      No employees registered yet. Share the training link with
                      your team!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {completedCount > 0 && (
          <div className="mt-8 rounded-xl border border-latte/20 bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-espresso">
              Completion Log
            </h2>
            <div className="space-y-2">
              {employeeProgress
                ?.filter((e) => e.is_course_complete)
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between border-b border-latte/10 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-espresso">
                        {emp.full_name}
                      </span>
                    </div>
                    <span className="text-sm text-mocha">
                      Completed{" "}
                      {emp.completion_date
                        ? new Date(emp.completion_date).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-green-200 bg-green-50/50"
          : "border-latte/20 bg-card"
      }`}
    >
      <Icon className={`h-5 w-5 ${highlight ? "text-green-600" : "text-mocha"}`} />
      <div className="mt-2 font-heading text-2xl font-bold text-espresso">
        {value}
      </div>
      <div className="text-sm text-mocha">{label}</div>
    </div>
  );
}

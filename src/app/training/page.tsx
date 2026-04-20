import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, BookOpen, CheckCircle2, ArrowRight } from "lucide-react";

export default async function TrainingDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1);

  const course = courses?.[0];
  if (!course) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <GraduationCap className="mx-auto h-16 w-16 text-mocha/40" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-espresso">
            Training Coming Soon
          </h1>
          <p className="mt-2 text-mocha">No courses available yet.</p>
        </div>
      </section>
    );
  }

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", course.id)
    .order("sort_order");

  const { data: progressData } = await supabase
    .from("module_progress")
    .select("*")
    .eq("user_id", user.id);

  const progressMap = new Map(
    progressData?.map((p) => [p.module_id, p]) || []
  );

  const completedModules = progressData?.filter((p) => p.is_complete).length || 0;
  const totalModules = modules?.length || 0;
  const progressPercent =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const { data: completion } = await supabase
    .from("course_completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .single();

  const isComplete = !!completion;

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-rust" />
          <div>
            <h1 className="font-heading text-3xl font-bold text-espresso">
              Team Training
            </h1>
            <p className="text-sm text-mocha">
              Welcome, {profile?.full_name || "Team Member"}
            </p>
          </div>
          {profile?.role === "admin" && (
            <Link
              href="/admin/training"
              className="ml-auto text-sm font-medium text-rust hover:underline"
            >
              Admin View →
            </Link>
          )}
        </div>

        {/* Progress Card */}
        <div className="mb-8 rounded-xl border border-latte/20 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-espresso">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-mocha">{course.description}</p>
            </div>
            <div className="text-right">
              <div className="font-heading text-3xl font-bold text-rust">
                {progressPercent}%
              </div>
              <div className="text-sm text-mocha">
                {completedModules}/{totalModules} modules
              </div>
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-latte/30">
            <div
              className="h-3 rounded-full bg-rust transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isComplete && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">
                  Training Complete!
                </p>
                <p className="text-sm text-green-600">
                  Completed on{" "}
                  {new Date(completion.completed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Module List */}
        <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">
          Modules
        </h2>
        <div className="grid gap-3">
          {modules?.map((module, index) => {
            const progress = progressMap.get(module.id);
            const isModuleComplete = progress?.is_complete || false;
            const lessonsDone = progress?.lessons_completed || 0;
            const lessonsTotal = progress?.total_lessons || 0;

            return (
              <Link
                key={module.id}
                href={`/training/module/${module.id}`}
                className={`group flex items-center gap-4 rounded-xl border p-5 transition-all hover:shadow-md ${
                  isModuleComplete
                    ? "border-green-200 bg-green-50/50"
                    : "border-latte/20 bg-white hover:-translate-y-0.5"
                }`}
              >
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                    isModuleComplete
                      ? "bg-green-500 text-white"
                      : "bg-latte/30 text-mocha"
                  }`}
                >
                  {isModuleComplete ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-espresso truncate">
                      {module.title}
                    </h3>
                    {module.is_required && (
                      <span className="flex-shrink-0 rounded-full bg-latte/20 px-2 py-0.5 text-xs text-mocha">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-mocha truncate">
                    {module.description}
                  </p>
                  {progress && (
                    <div className="mt-1 text-xs text-mocha/70">
                      {lessonsDone}/{lessonsTotal} lessons completed
                    </div>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-latte transition-colors group-hover:text-rust" />
              </Link>
            );
          })}
        </div>

        {/* Resources */}
        <div className="mt-12 rounded-xl border border-latte/20 bg-white p-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-espresso">
            <BookOpen className="h-5 w-5 text-rust" />
            Quick Reference Guides
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href="https://www.sca.coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-latte/10 p-4 transition-colors hover:bg-latte/5"
            >
              <p className="font-medium text-espresso">SCA Resources</p>
              <p className="text-sm text-mocha">Specialty Coffee Association</p>
            </a>
            <a
              href="https://www.baristahustle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-latte/10 p-4 transition-colors hover:bg-latte/5"
            >
              <p className="font-medium text-espresso">Barista Hustle</p>
              <p className="text-sm text-mocha">Online coffee education</p>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

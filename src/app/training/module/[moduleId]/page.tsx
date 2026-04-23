import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Play,
  HelpCircle,
} from "lucide-react";

interface Props {
  params: Promise<{ moduleId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moduleId } = await params;
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("title, description")
    .eq("id", moduleId)
    .single();

  if (!mod) return { title: "Module Not Found | Kynda Coffee" };

  return {
    title: `${mod.title} | Kynda Training`,
    description: mod.description ?? "Barista training module for Kynda Coffee team members.",
  };
}

export default async function TrainingModulePage({ params }: Props) {
  const { moduleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: mod } = await supabase
    .from("modules")
    .select("*, courses!inner(id)")
    .eq("id", moduleId)
    .single();

  if (!mod) redirect("/training");

  const courseId = mod.courses.id;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("sort_order");

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("*")
    .eq("module_id", moduleId)
    .order("sort_order");

  const { data: lessonProgress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id)
    .in("lesson_id", lessons?.map((l) => l.id) || []);

  const progressMap = new Map(
    lessonProgress?.map((p) => [p.lesson_id, p.completed]) || []
  );

  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, is_correct, selected_index")
    .eq("user_id", user.id)
    .in("quiz_id", quizzes?.map((q) => q.id) || []);

  const attemptMap = new Map(
    quizAttempts?.map((a) => [
      a.quiz_id,
      { is_correct: a.is_correct, selected_index: a.selected_index },
    ]) || []
  );

  const { data: allModules } = await supabase
    .from("modules")
    .select("id, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order");

  const currentIndex = allModules?.findIndex((m) => m.id === moduleId) ?? -1;
  const prevModule = currentIndex > 0 ? allModules?.[currentIndex - 1] : null;
  const nextModule =
    allModules && currentIndex < allModules.length - 1
      ? allModules[currentIndex + 1]
      : null;

  async function markLessonComplete(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const lessonId = formData.get("lessonId") as string;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
    await supabase.rpc("update_module_progress", {
      p_user_id: user.id,
      p_module_id: moduleId,
    });
    revalidatePath(`/training/module/${moduleId}`);
  }

  async function submitQuiz(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const quizId = formData.get("quizId") as string;
    const selectedIndex = parseInt(formData.get("selectedIndex") as string);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("correct_index")
      .eq("id", quizId)
      .single();

    const isCorrect = quiz?.correct_index === selectedIndex;
    await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      quiz_id: quizId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
    });
    await supabase.rpc("update_module_progress", {
      p_user_id: user.id,
      p_module_id: moduleId,
    });
    revalidatePath(`/training/module/${moduleId}`);
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-mocha">
          <Link href="/training" className="flex items-center gap-1 hover:text-espresso">
            <ArrowLeft className="h-4 w-4" />
            Training
          </Link>
          <span>/</span>
          <span>
            Module {currentIndex + 1} of {allModules?.length}
          </span>
        </div>

        {/* Module Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-mocha mb-2">
            <BookOpen className="h-4 w-4" />
            Module {currentIndex + 1}
            {mod.is_required && (
              <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs">
                Required
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold text-espresso">
            {mod.title}
          </h1>
          <p className="mt-2 text-mocha">{mod.description}</p>
        </div>

        {/* Lessons */}
        <div className="space-y-6">
          {lessons?.map((lesson, idx) => {
            const isComplete = progressMap.get(lesson.id) || false;
            return (
              <div
                key={lesson.id}
                className={`rounded-xl border p-6 ${
                  isComplete
                    ? "border-green-200 bg-green-50/30"
                    : "border-latte/20 bg-white"
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {lesson.lesson_type === "video" ? (
                      <Play className="h-5 w-5 text-rust" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-rust" />
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-espresso">
                        {idx + 1}. {lesson.title}
                      </h2>
                      {lesson.lesson_type === "video" && (
                        <span className="text-xs text-mocha">Video Lesson</span>
                      )}
                    </div>
                  </div>
                  {isComplete && (
                    <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Complete
                    </span>
                  )}
                </div>

                {/* Video */}
                {lesson.video_url && (
                  <div className="relative mb-4 w-full overflow-hidden rounded-lg bg-espresso/5 pb-[56.25%]">
                    <iframe
                      src={lesson.video_url}
                      title={lesson.video_title || lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute left-0 top-0 h-full w-full border-0"
                    />
                  </div>
                )}

                {/* Content */}
                {lesson.content && (
                  <div className="prose prose-espresso max-w-none text-mocha leading-relaxed">
                    {lesson.content
                      .split("\n\n")
                      .map((paragraph: string, i: number) => (
                        <p key={i} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                )}

                {/* Mark Complete */}
                {!isComplete && (
                  <form action={markLessonComplete} className="mt-4">
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <button type="submit" className="btn-primary text-sm">
                      Mark as Complete
                    </button>
                  </form>
                )}
              </div>
            );
          })}

          {/* Quizzes */}
          {quizzes && quizzes.length > 0 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-espresso">
                <HelpCircle className="h-5 w-5 text-rust" />
                Knowledge Check
              </h2>
              {quizzes.map((quiz) => {
                const attempt = attemptMap.get(quiz.id);
                const alreadyAnswered = !!attempt;

                return (
                  <div
                    key={quiz.id}
                    className="rounded-xl border border-latte/20 bg-white p-6"
                  >
                    <p className="font-semibold text-espresso mb-4">
                      {quiz.question}
                    </p>
                    <form action={submitQuiz}>
                      <input type="hidden" name="quizId" value={quiz.id} />
                      <div className="space-y-2">
                        {(quiz.options as string[]).map((option, optIdx) => {
                          let cls =
                            "block w-full rounded-lg border-2 p-4 text-left transition-colors cursor-pointer";
                          if (alreadyAnswered) {
                            if (optIdx === quiz.correct_index)
                              cls += " border-green-500 bg-green-50";
                            else if (optIdx === attempt.selected_index)
                              cls += " border-red-400 bg-red-50";
                            else cls += " border-latte/20";
                          } else {
                            cls +=
                              " border-latte/20 hover:border-latte/50";
                          }

                          return (
                            <label key={optIdx} className={cls}>
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="selectedIndex"
                                  value={optIdx}
                                  disabled={alreadyAnswered}
                                  defaultChecked={
                                    attempt?.selected_index === optIdx
                                  }
                                  className="accent-rust"
                                />
                                <span className="text-espresso">{option}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {!alreadyAnswered && (
                        <button type="submit" className="btn-primary mt-4 text-sm">
                          Submit Answer
                        </button>
                      )}
                      {alreadyAnswered && quiz.explanation && (
                        <div
                          className={`mt-4 rounded-lg p-3 text-sm ${
                            attempt.is_correct
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {attempt.is_correct ? "✓ Correct! " : "✗ "}
                          {quiz.explanation}
                        </div>
                      )}
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-latte/20 pt-8">
          {prevModule ? (
            <Link
              href={`/training/module/${prevModule.id}`}
              className="btn-secondary text-sm"
            >
              <ArrowLeft className="mr-1 inline h-4 w-4" />
              {prevModule.title}
            </Link>
          ) : (
            <div />
          )}
          {nextModule ? (
            <Link
              href={`/training/module/${nextModule.id}`}
              className="btn-primary text-sm"
            >
              {nextModule.title}
              <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          ) : (
            <Link href="/training" className="btn-primary text-sm">
              Back to Training
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

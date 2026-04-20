import { createClient } from "@supabase/supabase-js";
import { modules1to4 } from "./modules-01-04";
import { modules5to8 } from "./modules-05-08";
import { modules9to12 } from "./modules-09-12";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const allModules = [...modules1to4, ...modules5to8, ...modules9to12];

async function seed() {
  console.log("Seeding Kynda Coffee Training Platform...\n");

  // 1. Create course
  console.log("Creating course...");
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .upsert(
      {
        title: "Kynda Coffee Specialty Masterclass",
        slug: "kynda-masterclass",
        description:
          "Comprehensive training for every Kynda Coffee team member — from coffee origins to latte art, customer service, and the philosophy of excellence.",
        sort_order: 1,
        is_active: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (courseErr || !course) {
    console.error("Course creation failed:", courseErr?.message);
    process.exit(1);
  }
  console.log(`  Course created: ${course.title} (${course.id})\n`);

  // 2. Create modules, lessons, quizzes
  for (const modData of allModules) {
    console.log(`Module: ${modData.title}`);

    const { data: mod, error: modErr } = await supabase
      .from("modules")
      .upsert(
        {
          course_id: course.id,
          title: modData.title,
          slug: modData.slug,
          description: modData.description,
          sort_order: modData.sort_order,
          is_required: modData.is_required,
        },
        { onConflict: "course_id,slug" }
      )
      .select()
      .single();

    if (modErr || !mod) {
      console.error(`  Module failed: ${modErr?.message}`);
      continue;
    }

    // Lessons
    for (const lesson of modData.lessons) {
      const { error: lErr } = await supabase
        .from("lessons")
        .upsert(
          {
            module_id: mod.id,
            title: lesson.title,
            slug: lesson.slug,
            content: lesson.content,
            video_url: lesson.video_url,
            video_title: lesson.video_title,
            sort_order: lesson.sort_order,
            lesson_type: lesson.lesson_type,
          },
          { onConflict: "module_id,slug" }
        );

      if (lErr) {
        console.error(`    Lesson failed: ${lErr.message}`);
      } else {
        console.log(`    Lesson: ${lesson.title}`);
      }
    }

    // Quizzes — delete old ones first, then insert fresh
    await supabase.from("quizzes").delete().eq("module_id", mod.id);

    for (const quiz of modData.quizzes) {
      const { error: qErr } = await supabase.from("quizzes").insert({
        module_id: mod.id,
        question: quiz.question,
        options: quiz.options,
        correct_index: quiz.correct_index,
        explanation: quiz.explanation,
        sort_order: quiz.sort_order,
      });

      if (qErr) {
        console.error(`    Quiz failed: ${qErr.message}`);
      } else {
        console.log(`    Quiz: ${quiz.question.substring(0, 50)}...`);
      }
    }

    console.log("");
  }

  // Summary
  const { count: modCount } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("course_id", course.id);

  const { count: lessonCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true });

  const { count: quizCount } = await supabase
    .from("quizzes")
    .select("*", { count: "exact", head: true });

  console.log("========================================");
  console.log("Seeding complete!");
  console.log(`  Course: ${course.title}`);
  console.log(`  Modules: ${modCount}`);
  console.log(`  Lessons: ${lessonCount}`);
  console.log(`  Quizzes: ${quizCount}`);
  console.log("========================================");
}

seed().catch(console.error);

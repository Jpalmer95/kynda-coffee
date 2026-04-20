-- Kynda Coffee Training Platform - Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        CASE
            WHEN NEW.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
            THEN 'admin'
            ELSE 'employee'
        END
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Profile policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 2. COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active courses" ON public.courses;
CREATE POLICY "Anyone can read active courses" ON public.courses
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 3. MODULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(course_id, slug)
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read modules" ON public.modules;
CREATE POLICY "Anyone can read modules" ON public.modules
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 4. LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    video_url TEXT,
    video_title TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    lesson_type TEXT NOT NULL DEFAULT 'text' CHECK (lesson_type IN ('text', 'video', 'mixed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(module_id, slug)
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read lessons" ON public.lessons;
CREATE POLICY "Anyone can read lessons" ON public.lessons
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 5. QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_index INT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quizzes" ON public.quizzes;
CREATE POLICY "Anyone can read quizzes" ON public.quizzes
    FOR SELECT USING (true);

-- ============================================================
-- 6. QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    selected_index INT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can read own attempts" ON public.quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can read all attempts" ON public.quiz_attempts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 7. LESSON PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all lesson progress" ON public.lesson_progress;
CREATE POLICY "Admins can read all lesson progress" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 8. MODULE PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.module_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    lessons_completed INT NOT NULL DEFAULT 0,
    total_lessons INT NOT NULL DEFAULT 0,
    quizzes_passed INT NOT NULL DEFAULT 0,
    total_quizzes INT NOT NULL DEFAULT 0,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, module_id)
);

ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own module progress" ON public.module_progress;
CREATE POLICY "Users can manage own module progress" ON public.module_progress
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all module progress" ON public.module_progress;
CREATE POLICY "Admins can read all module progress" ON public.module_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 9. COURSE COMPLETIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, course_id)
);

ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own completions" ON public.course_completions;
CREATE POLICY "Users can read own completions" ON public.course_completions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own completions" ON public.course_completions;
CREATE POLICY "Users can insert own completions" ON public.course_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all completions" ON public.course_completions;
CREATE POLICY "Admins can read all completions" ON public.course_completions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 10. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_modules_course ON public.modules(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON public.quizzes(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON public.module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_user ON public.course_completions(user_id);

-- ============================================================
-- 11. HELPER FUNCTION: Update module progress
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_module_progress(p_user_id UUID, p_module_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_lessons INT;
    v_completed_lessons INT;
    v_total_quizzes INT;
    v_passed_quizzes INT;
BEGIN
    -- Count lessons
    SELECT COUNT(*) INTO v_total_lessons FROM public.lessons WHERE module_id = p_module_id;
    SELECT COUNT(*) INTO v_completed_lessons FROM public.lesson_progress
    WHERE user_id = p_user_id AND lesson_id IN (SELECT id FROM public.lessons WHERE module_id = p_module_id) AND completed = true;

    -- Count quizzes
    SELECT COUNT(*) INTO v_total_quizzes FROM public.quizzes WHERE module_id = p_module_id;
    SELECT COUNT(DISTINCT quiz_id) INTO v_passed_quizzes FROM public.quiz_attempts
    WHERE user_id = p_user_id AND is_correct = true AND quiz_id IN (SELECT id FROM public.quizzes WHERE module_id = p_module_id);

    -- Upsert module progress
    INSERT INTO public.module_progress (user_id, module_id, lessons_completed, total_lessons, quizzes_passed, total_quizzes, is_complete, completed_at, updated_at)
    VALUES (
        p_user_id, p_module_id,
        v_completed_lessons, v_total_lessons,
        v_passed_quizzes, v_total_quizzes,
        (v_completed_lessons >= v_total_lessons AND (v_total_quizzes = 0 OR v_passed_quizzes >= v_total_quizzes)),
        CASE WHEN (v_completed_lessons >= v_total_lessons AND (v_total_quizzes = 0 OR v_passed_quizzes >= v_total_quizzes)) THEN now() ELSE NULL END,
        now()
    )
    ON CONFLICT (user_id, module_id) DO UPDATE SET
        lessons_completed = EXCLUDED.lessons_completed,
        total_lessons = EXCLUDED.total_lessons,
        quizzes_passed = EXCLUDED.quizzes_passed,
        total_quizzes = EXCLUDED.total_quizzes,
        is_complete = EXCLUDED.is_complete,
        completed_at = EXCLUDED.completed_at,
        updated_at = now();
END;
$$;

-- ============================================================
-- 12. HELPER FUNCTION: Check course completion
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_course_completion(p_user_id UUID, p_course_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_required INT;
    v_completed_required INT;
    v_already_complete BOOLEAN;
BEGIN
    -- Check if already completed
    SELECT EXISTS(SELECT 1 FROM public.course_completions WHERE user_id = p_user_id AND course_id = p_course_id) INTO v_already_complete;
    IF v_already_complete THEN RETURN true; END IF;

    -- Count required modules
    SELECT COUNT(*) INTO v_total_required FROM public.modules WHERE course_id = p_course_id AND is_required = true;
    SELECT COUNT(*) INTO v_completed_required FROM public.module_progress mp
    JOIN public.modules m ON m.id = mp.module_id
    WHERE mp.user_id = p_user_id AND m.course_id = p_course_id AND m.is_required = true AND mp.is_complete = true;

    -- If all required modules complete, mark course complete
    IF v_total_required > 0 AND v_completed_required >= v_total_required THEN
        INSERT INTO public.course_completions (user_id, course_id) VALUES (p_user_id, p_course_id)
        ON CONFLICT DO NOTHING;
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

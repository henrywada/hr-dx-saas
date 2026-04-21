-- eラーニング機能のテーブル群
-- el_courses: コース（template/tenant の2種類）
-- el_slides: スライド（text/image/quiz）
-- el_quiz_questions / el_quiz_options: クイズ問題と選択肢
-- el_assignments: 受講割り当て
-- el_progress: 学習進捗

-- ============================================================
-- コーステーブル
-- tenant_id IS NULL → テンプレートコース（SaaS管理者が管理）
-- tenant_id IS NOT NULL → テナントコース
-- ============================================================
CREATE TABLE IF NOT EXISTS public.el_courses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  description            TEXT,
  category               TEXT NOT NULL DEFAULT '初級',
  status                 TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  course_type            TEXT NOT NULL DEFAULT 'tenant'
    CHECK (course_type IN ('template', 'tenant')),
  original_course_id     UUID REFERENCES public.el_courses(id) ON DELETE SET NULL,
  thumbnail_url          TEXT,
  estimated_minutes      INT,
  created_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_courses_tenant_id    ON public.el_courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_el_courses_course_type  ON public.el_courses(course_type);
CREATE INDEX IF NOT EXISTS idx_el_courses_status       ON public.el_courses(status);

CREATE TRIGGER set_el_courses_updated_at
  BEFORE UPDATE ON public.el_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- スライドテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.el_slides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  slide_order INT NOT NULL DEFAULT 0,
  slide_type  TEXT NOT NULL DEFAULT 'text'
    CHECK (slide_type IN ('text', 'image', 'quiz')),
  title       TEXT,
  content     TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_slides_course_id ON public.el_slides(course_id, slide_order);

CREATE TRIGGER set_el_slides_updated_at
  BEFORE UPDATE ON public.el_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- クイズ問題テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.el_quiz_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id       UUID NOT NULL REFERENCES public.el_slides(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  question_order INT NOT NULL DEFAULT 0,
  explanation    TEXT
);

CREATE INDEX IF NOT EXISTS idx_el_quiz_questions_slide_id ON public.el_quiz_questions(slide_id);

-- ============================================================
-- クイズ選択肢テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.el_quiz_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES public.el_quiz_questions(id) ON DELETE CASCADE,
  option_text  TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT false,
  option_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_el_quiz_options_question_id ON public.el_quiz_options(question_id);

-- ============================================================
-- 受講割り当てテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.el_assignments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id               UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  employee_id             UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  due_date                DATE,
  assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_el_assignments_tenant_employee ON public.el_assignments(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_el_assignments_course_id       ON public.el_assignments(course_id);

-- ============================================================
-- 学習進捗テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.el_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.el_assignments(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  slide_id      UUID REFERENCES public.el_slides(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ,
  quiz_score    INT CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
  status        TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  UNIQUE(assignment_id, slide_id)
);

CREATE INDEX IF NOT EXISTS idx_el_progress_assignment_id ON public.el_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_el_progress_tenant_id     ON public.el_progress(tenant_id);

-- ============================================================
-- RLS ポリシー
-- ============================================================

-- el_courses
ALTER TABLE public.el_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_courses_select" ON public.el_courses
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    OR tenant_id IS NULL
  );

CREATE POLICY "el_courses_insert" ON public.el_courses
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    OR (tenant_id IS NULL AND public.current_employee_app_role() = 'developer')
  );

CREATE POLICY "el_courses_update" ON public.el_courses
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    OR (tenant_id IS NULL AND public.current_employee_app_role() = 'developer')
  );

CREATE POLICY "el_courses_delete" ON public.el_courses
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    OR (tenant_id IS NULL AND public.current_employee_app_role() = 'developer')
  );

-- el_slides: コースの RLS を経由して制御
ALTER TABLE public.el_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_slides_all" ON public.el_slides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.el_courses c
      WHERE c.id = el_slides.course_id
        AND (c.tenant_id = public.current_tenant_id() OR c.tenant_id IS NULL)
    )
  );

-- el_quiz_questions
ALTER TABLE public.el_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_quiz_questions_all" ON public.el_quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.el_slides s
      JOIN public.el_courses c ON c.id = s.course_id
      WHERE s.id = el_quiz_questions.slide_id
        AND (c.tenant_id = public.current_tenant_id() OR c.tenant_id IS NULL)
    )
  );

-- el_quiz_options
ALTER TABLE public.el_quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_quiz_options_all" ON public.el_quiz_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.el_quiz_questions q
      JOIN public.el_slides s ON s.id = q.slide_id
      JOIN public.el_courses c ON c.id = s.course_id
      WHERE q.id = el_quiz_options.question_id
        AND (c.tenant_id = public.current_tenant_id() OR c.tenant_id IS NULL)
    )
  );

-- el_assignments
ALTER TABLE public.el_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_assignments_tenant" ON public.el_assignments
  FOR ALL USING (tenant_id = public.current_tenant_id());

-- el_progress
ALTER TABLE public.el_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_progress_tenant" ON public.el_progress
  FOR ALL USING (tenant_id = public.current_tenant_id());

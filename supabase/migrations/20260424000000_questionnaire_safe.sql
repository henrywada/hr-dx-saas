-- =============================================================================
-- 汎用アンケート機能（既存データ保護版）
-- IF NOT EXISTS を使用して、既存テーブルがあれば無視
-- =============================================================================

-- -------------------------------------------------------------------
-- アンケートマスタ
-- creator_type='system': 全テナント共用（tenant_id IS NULL）
-- creator_type='tenant': 作成テナントのみ使用可（tenant_id NOT NULL）
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questionnaires (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_type           TEXT NOT NULL CHECK (creator_type IN ('system', 'tenant')),
  tenant_id              UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  description            TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'active', 'closed')),
  created_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT questionnaires_tenant_check CHECK (
    (creator_type = 'system' AND tenant_id IS NULL)
    OR (creator_type = 'tenant' AND tenant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS questionnaires_tenant_id_idx ON public.questionnaires(tenant_id);
CREATE INDEX IF NOT EXISTS questionnaires_creator_type_idx ON public.questionnaires(creator_type);

-- セクション（例：【お客様属性】）
CREATE TABLE IF NOT EXISTS public.questionnaire_sections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  sort_order       INT  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS questionnaire_sections_questionnaire_id_idx
  ON public.questionnaire_sections(questionnaire_id);

-- 設問（radio / checkbox / rating_table / text）
CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  section_id       UUID REFERENCES public.questionnaire_sections(id) ON DELETE SET NULL,
  question_type    TEXT NOT NULL
    CHECK (question_type IN ('radio', 'checkbox', 'rating_table', 'text')),
  question_text    TEXT NOT NULL,
  scale_labels     JSONB,
  is_required      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INT     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS questionnaire_questions_questionnaire_id_idx
  ON public.questionnaire_questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS questionnaire_questions_section_id_idx
  ON public.questionnaire_questions(section_id);

-- 選択肢（radio / checkbox 用）
CREATE TABLE IF NOT EXISTS public.questionnaire_question_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS questionnaire_question_options_question_id_idx
  ON public.questionnaire_question_options(question_id);

-- 評価項目（rating_table の行：品質・価格・サポート等）
CREATE TABLE IF NOT EXISTS public.questionnaire_question_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  item_text   TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS questionnaire_question_items_question_id_idx
  ON public.questionnaire_question_items(question_id);

-- アサイン（対象従業員と期限）
CREATE TABLE IF NOT EXISTS public.questionnaire_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  deadline_date    DATE,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (questionnaire_id, employee_id)
);

CREATE INDEX IF NOT EXISTS questionnaire_assignments_tenant_id_idx
  ON public.questionnaire_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS questionnaire_assignments_employee_id_idx
  ON public.questionnaire_assignments(employee_id);

-- 回答セッション（1アサイン = 1レコード、submitted_at IS NULL で未提出）
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id),
  assignment_id    UUID NOT NULL UNIQUE REFERENCES public.questionnaire_assignments(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES public.employees(id),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
  submitted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS questionnaire_responses_tenant_id_idx
  ON public.questionnaire_responses(tenant_id);
CREATE INDEX IF NOT EXISTS questionnaire_responses_employee_id_idx
  ON public.questionnaire_responses(employee_id);
CREATE INDEX IF NOT EXISTS questionnaire_responses_assignment_id_idx
  ON public.questionnaire_responses(assignment_id);

-- 回答詳細
CREATE TABLE IF NOT EXISTS public.questionnaire_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.questionnaire_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id),
  item_id     UUID REFERENCES public.questionnaire_question_items(id),
  option_id   UUID REFERENCES public.questionnaire_question_options(id),
  text_answer TEXT,
  score       INT
);

CREATE INDEX IF NOT EXISTS questionnaire_answers_response_id_idx
  ON public.questionnaire_answers(response_id);

-- -------------------------------------------------------------------
-- updated_at トリガー（既存関数を使用）
-- -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TRIGGER set_questionnaires_updated_at
    BEFORE UPDATE ON public.questionnaires
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------------------
-- RLS 有効化
-- -------------------------------------------------------------------
ALTER TABLE public.questionnaires               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_sections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_question_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answers        ENABLE ROW LEVEL SECURITY;

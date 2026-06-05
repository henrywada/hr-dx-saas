-- =============================================================================
-- 360度評価サポート テーブル群
-- =============================================================================
-- 既存テーブルは一切変更しない。新規追加のみ。
-- RLS: public.current_tenant_id() でテナント隔離

-- ① キャンペーン（360評価の実施単位）
CREATE TABLE IF NOT EXISTS public.review_360_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  period_id   UUID REFERENCES public.evaluation_periods(id),
  deadline    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'open', 'closed')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_r360_campaigns_tenant ON public.review_360_campaigns(tenant_id, status);

ALTER TABLE public.review_360_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r360c_select" ON public.review_360_campaigns
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "r360c_insert" ON public.review_360_campaigns
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360c_update" ON public.review_360_campaigns
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360c_delete" ON public.review_360_campaigns
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ② 被評価者（キャンペーンに紐づく対象従業員）
CREATE TABLE IF NOT EXISTS public.review_360_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.review_360_campaigns(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, employee_id)
);

CREATE INDEX idx_r360_subjects_campaign ON public.review_360_subjects(campaign_id);
CREATE INDEX idx_r360_subjects_employee ON public.review_360_subjects(employee_id);

ALTER TABLE public.review_360_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r360s_select" ON public.review_360_subjects
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "r360s_insert" ON public.review_360_subjects
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360s_delete" ON public.review_360_subjects
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ③ 評価者（誰が誰を評価するか）
CREATE TABLE IF NOT EXISTS public.review_360_reviewers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id           UUID NOT NULL REFERENCES public.review_360_subjects(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reviewer_employee_id UUID NOT NULL REFERENCES public.employees(id),
  reviewer_type        TEXT NOT NULL
                       CHECK (reviewer_type IN ('superior', 'peer', 'subordinate', 'self')),
  is_anonymous         BOOLEAN NOT NULL DEFAULT false,
  submitted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, reviewer_employee_id)
);

CREATE INDEX idx_r360_reviewers_subject   ON public.review_360_reviewers(subject_id);
CREATE INDEX idx_r360_reviewers_reviewer  ON public.review_360_reviewers(reviewer_employee_id);
CREATE INDEX idx_r360_reviewers_submitted ON public.review_360_reviewers(submitted_at);

ALTER TABLE public.review_360_reviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r360r_select" ON public.review_360_reviewers
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "r360r_insert" ON public.review_360_reviewers
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360r_update" ON public.review_360_reviewers
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360r_delete" ON public.review_360_reviewers
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ④ 評価質問（キャンペーンごとの設問）
CREATE TABLE IF NOT EXISTS public.review_360_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES public.review_360_campaigns(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category      TEXT NOT NULL
                CHECK (category IN ('leadership', 'communication', 'execution', 'collaboration', 'development')),
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_r360_questions_campaign ON public.review_360_questions(campaign_id, sort_order);

ALTER TABLE public.review_360_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r360q_select" ON public.review_360_questions
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "r360q_insert" ON public.review_360_questions
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360q_delete" ON public.review_360_questions
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ⑤ 回答（評価者×設問ごと）
CREATE TABLE IF NOT EXISTS public.review_360_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES public.review_360_reviewers(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.review_360_questions(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  score       INT CHECK (score BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reviewer_id, question_id)
);

CREATE INDEX idx_r360_responses_reviewer ON public.review_360_responses(reviewer_id);
CREATE INDEX idx_r360_responses_question ON public.review_360_responses(question_id);

ALTER TABLE public.review_360_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r360res_select" ON public.review_360_responses
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "r360res_insert" ON public.review_360_responses
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "r360res_update" ON public.review_360_responses
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

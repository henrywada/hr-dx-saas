-- =============================================================================
-- 汎用アンケート機能
-- questionnaires, sections, questions, options, items, assignments, responses, answers
-- =============================================================================

-- -------------------------------------------------------------------
-- アンケートマスタ
-- creator_type='system': 全テナント共用（tenant_id IS NULL）
-- creator_type='tenant': 作成テナントのみ使用可（tenant_id NOT NULL）
-- -------------------------------------------------------------------
CREATE TABLE public.questionnaires (
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

CREATE INDEX questionnaires_tenant_id_idx ON public.questionnaires(tenant_id);
CREATE INDEX questionnaires_creator_type_idx ON public.questionnaires(creator_type);

-- セクション（例：【お客様属性】）
CREATE TABLE public.questionnaire_sections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  sort_order       INT  NOT NULL DEFAULT 0
);

CREATE INDEX questionnaire_sections_questionnaire_id_idx
  ON public.questionnaire_sections(questionnaire_id);

-- 設問（radio / checkbox / rating_table / text）
CREATE TABLE public.questionnaire_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  section_id       UUID REFERENCES public.questionnaire_sections(id) ON DELETE SET NULL,
  question_type    TEXT NOT NULL
    CHECK (question_type IN ('radio', 'checkbox', 'rating_table', 'text')),
  question_text    TEXT NOT NULL,
  -- rating_table 用スケールラベル例: ["非常に不満","やや不満","どちらとも言えない","やや満足","非常に満足"]
  scale_labels     JSONB,
  is_required      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INT     NOT NULL DEFAULT 0
);

CREATE INDEX questionnaire_questions_questionnaire_id_idx
  ON public.questionnaire_questions(questionnaire_id);
CREATE INDEX questionnaire_questions_section_id_idx
  ON public.questionnaire_questions(section_id);

-- 選択肢（radio / checkbox 用）
CREATE TABLE public.questionnaire_question_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE INDEX questionnaire_question_options_question_id_idx
  ON public.questionnaire_question_options(question_id);

-- 評価項目（rating_table の行：品質・価格・サポート等）
CREATE TABLE public.questionnaire_question_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  item_text   TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE INDEX questionnaire_question_items_question_id_idx
  ON public.questionnaire_question_items(question_id);

-- アサイン（対象従業員と期限）
CREATE TABLE public.questionnaire_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  deadline_date    DATE,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (questionnaire_id, employee_id)
);

CREATE INDEX questionnaire_assignments_tenant_id_idx
  ON public.questionnaire_assignments(tenant_id);
CREATE INDEX questionnaire_assignments_employee_id_idx
  ON public.questionnaire_assignments(employee_id);

-- 回答セッション（1アサイン = 1レコード、submitted_at IS NULL で未提出）
CREATE TABLE public.questionnaire_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id),
  assignment_id    UUID NOT NULL UNIQUE REFERENCES public.questionnaire_assignments(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES public.employees(id),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
  submitted_at     TIMESTAMPTZ
);

CREATE INDEX questionnaire_responses_tenant_id_idx
  ON public.questionnaire_responses(tenant_id);
CREATE INDEX questionnaire_responses_employee_id_idx
  ON public.questionnaire_responses(employee_id);
CREATE INDEX questionnaire_responses_assignment_id_idx
  ON public.questionnaire_responses(assignment_id);

-- 回答詳細
CREATE TABLE public.questionnaire_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.questionnaire_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id),
  item_id     UUID REFERENCES public.questionnaire_question_items(id),   -- rating_table 行
  option_id   UUID REFERENCES public.questionnaire_question_options(id), -- radio/checkbox
  text_answer TEXT,                                                        -- text 型
  score       INT                                                          -- rating_table スコア
);

CREATE INDEX questionnaire_answers_response_id_idx
  ON public.questionnaire_answers(response_id);

-- -------------------------------------------------------------------
-- updated_at トリガー
-- -------------------------------------------------------------------
CREATE TRIGGER set_questionnaires_updated_at
  BEFORE UPDATE ON public.questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

-- -------------------------------------------------------------------
-- questionnaires ポリシー
-- -------------------------------------------------------------------
-- 全ユーザー：システム区分は全テナント、テナント区分は自テナントのみ
CREATE POLICY "questionnaires_select"
  ON public.questionnaires FOR SELECT TO authenticated
  USING (
    creator_type = 'system'
    OR tenant_id = public.current_tenant_id()
  );

-- developer はシステム区分を作成可、hr/hr_manager/developer はテナント区分を作成可
CREATE POLICY "questionnaires_insert"
  ON public.questionnaires FOR INSERT TO authenticated
  WITH CHECK (
    (creator_type = 'system'
      AND tenant_id IS NULL
      AND public.current_employee_app_role() = 'developer')
    OR
    (creator_type = 'tenant'
      AND tenant_id = public.current_tenant_id()
      AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
  );

CREATE POLICY "questionnaires_update"
  ON public.questionnaires FOR UPDATE TO authenticated
  USING (
    (creator_type = 'system' AND public.current_employee_app_role() = 'developer')
    OR (creator_type = 'tenant' AND tenant_id = public.current_tenant_id()
        AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
  )
  WITH CHECK (
    (creator_type = 'system' AND public.current_employee_app_role() = 'developer')
    OR (creator_type = 'tenant' AND tenant_id = public.current_tenant_id()
        AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
  );

-- draft のみ削除可（active/closed は削除不可）
CREATE POLICY "questionnaires_delete"
  ON public.questionnaires FOR DELETE TO authenticated
  USING (
    status = 'draft'
    AND (
      (creator_type = 'system' AND public.current_employee_app_role() = 'developer')
      OR (creator_type = 'tenant' AND tenant_id = public.current_tenant_id()
          AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
    )
  );

-- -------------------------------------------------------------------
-- questionnaire_sections ポリシー
-- -------------------------------------------------------------------
CREATE POLICY "questionnaire_sections_select"
  ON public.questionnaire_sections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_sections.questionnaire_id
        AND (q.creator_type = 'system' OR q.tenant_id = public.current_tenant_id())
    )
  );

CREATE POLICY "questionnaire_sections_insert"
  ON public.questionnaire_sections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_sections.questionnaire_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_sections_update"
  ON public.questionnaire_sections FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_sections.questionnaire_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_sections_delete"
  ON public.questionnaire_sections FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_sections.questionnaire_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

-- -------------------------------------------------------------------
-- questionnaire_questions ポリシー（questionnaire_sections と同パターン）
-- -------------------------------------------------------------------
CREATE POLICY "questionnaire_questions_select"
  ON public.questionnaire_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_questions.questionnaire_id
        AND (q.creator_type = 'system' OR q.tenant_id = public.current_tenant_id())
    )
  );

CREATE POLICY "questionnaire_questions_insert"
  ON public.questionnaire_questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_questions.questionnaire_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_questions_update"
  ON public.questionnaire_questions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_questions.questionnaire_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_questions_delete"
  ON public.questionnaire_questions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_questions.questionnaire_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

-- -------------------------------------------------------------------
-- questionnaire_question_options ポリシー
-- -------------------------------------------------------------------
CREATE POLICY "questionnaire_question_options_select"
  ON public.questionnaire_question_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_options.question_id
        AND (q.creator_type = 'system' OR q.tenant_id = public.current_tenant_id())
    )
  );

CREATE POLICY "questionnaire_question_options_insert"
  ON public.questionnaire_question_options FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_options.question_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_question_options_update"
  ON public.questionnaire_question_options FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_options.question_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_question_options_delete"
  ON public.questionnaire_question_options FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_options.question_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

-- -------------------------------------------------------------------
-- questionnaire_question_items ポリシー（options と同パターン）
-- -------------------------------------------------------------------
CREATE POLICY "questionnaire_question_items_select"
  ON public.questionnaire_question_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_items.question_id
        AND (q.creator_type = 'system' OR q.tenant_id = public.current_tenant_id())
    )
  );

CREATE POLICY "questionnaire_question_items_insert"
  ON public.questionnaire_question_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_items.question_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_question_items_update"
  ON public.questionnaire_question_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_items.question_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

CREATE POLICY "questionnaire_question_items_delete"
  ON public.questionnaire_question_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_questions qq
      JOIN public.questionnaires q ON q.id = qq.questionnaire_id
      WHERE qq.id = questionnaire_question_items.question_id
        AND q.status = 'draft'
        AND (
          (q.creator_type = 'system' AND public.current_employee_app_role() = 'developer')
          OR (q.creator_type = 'tenant' AND q.tenant_id = public.current_tenant_id()
              AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
        )
    )
  );

-- -------------------------------------------------------------------
-- questionnaire_assignments ポリシー
-- -------------------------------------------------------------------
-- 自テナント内全件閲覧（HR 用）
CREATE POLICY "questionnaire_assignments_select"
  ON public.questionnaire_assignments FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "questionnaire_assignments_insert"
  ON public.questionnaire_assignments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer'])
  );

CREATE POLICY "questionnaire_assignments_delete"
  ON public.questionnaire_assignments FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer'])
  );

-- -------------------------------------------------------------------
-- questionnaire_responses ポリシー
-- -------------------------------------------------------------------
-- 自分の回答 or HR 全件
CREATE POLICY "questionnaire_responses_select"
  ON public.questionnaire_responses FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer'])
    )
  );

CREATE POLICY "questionnaire_responses_insert"
  ON public.questionnaire_responses FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- 未提出の回答のみ更新可
CREATE POLICY "questionnaire_responses_update"
  ON public.questionnaire_responses FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND submitted_at IS NULL
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- -------------------------------------------------------------------
-- questionnaire_answers ポリシー
-- -------------------------------------------------------------------
CREATE POLICY "questionnaire_answers_select"
  ON public.questionnaire_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_responses r
      WHERE r.id = questionnaire_answers.response_id
        AND r.tenant_id = public.current_tenant_id()
        AND (
          r.employee_id = public.current_employee_id()
          OR public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer'])
        )
    )
  );

CREATE POLICY "questionnaire_answers_insert"
  ON public.questionnaire_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaire_responses r
      WHERE r.id = questionnaire_answers.response_id
        AND r.employee_id = public.current_employee_id()
        AND r.submitted_at IS NULL
    )
  );

CREATE POLICY "questionnaire_answers_delete"
  ON public.questionnaire_answers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_responses r
      WHERE r.id = questionnaire_answers.response_id
        AND r.employee_id = public.current_employee_id()
        AND r.submitted_at IS NULL
    )
  );

-- -------------------------------------------------------------------
-- GRANT
-- -------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaires TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_question_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_question_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE           ON public.questionnaire_responses TO authenticated;
GRANT SELECT, INSERT, DELETE           ON public.questionnaire_answers TO authenticated;

-- -------------------------------------------------------------------
-- サイドバー登録: 管理：アンケート管理（管理：組織健康度カテゴリ）
-- service_category_id: 2c64738f = 管理：組織健康度
-- app_role: hr=f422469d, hr_manager=c50ebd55, developer=74f8e05b
-- -------------------------------------------------------------------
INSERT INTO public.service (
  id, service_category_id, name, category, title, description,
  sort_order, route_path, app_role_group_id, app_role_group_uuid,
  target_audience, release_status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-123456789001',
  '2c64738f-bee1-458d-afae-67033faeceb0',
  'アンケート管理',
  NULL,
  'アンケート管理',
  '従業員向けアンケートの作成・設問編集・対象者へのアサインを行います。システム区分（全テナント共用）とテナント区分（自社専用）の2種類を管理できます。',
  400,
  '/adm/Survey',
  NULL,
  NULL,
  'adm',
  '公開'
) ON CONFLICT (id) DO NOTHING;

-- hr, hr_manager, developer にサービスを紐づけ
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), r.app_role_id, 'a1b2c3d4-e5f6-7890-abcd-123456789001'::uuid
FROM (VALUES
  ('f422469d-c1e0-4a10-ac6c-4b656b4fec64'::uuid),  -- hr
  ('c50ebd55-3466-43dc-a702-5d8321908d69'::uuid),  -- hr_manager
  ('74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid)   -- developer
) AS r(app_role_id)
WHERE EXISTS (SELECT 1 FROM public.app_role ar WHERE ar.id = r.app_role_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = r.app_role_id
      AND ars.service_id = 'a1b2c3d4-e5f6-7890-abcd-123456789001'::uuid
  );

-- 既存テナント全件に追加
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, 'a1b2c3d4-e5f6-7890-abcd-123456789001'::uuid
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id
    AND ts.service_id = 'a1b2c3d4-e5f6-7890-abcd-123456789001'::uuid
);

-- -------------------------------------------------------------------
-- サイドバー登録: 回答ページ（組織の健康カテゴリ・all_users）
-- service_category_id: 1dc338ff = 組織の健康
-- -------------------------------------------------------------------
INSERT INTO public.service (
  id, service_category_id, name, category, title, description,
  sort_order, route_path, app_role_group_id, app_role_group_uuid,
  target_audience, release_status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-123456789002',
  '1dc338ff-19d7-407e-94e4-06e60b1339a0',
  'アンケートに回答する',
  NULL,
  'アンケートに回答する',
  '担当者から依頼されたアンケートに回答します。',
  300,
  '/answers',
  NULL,
  NULL,
  'all_users',
  '公開'
) ON CONFLICT (id) DO NOTHING;

-- 全ロールに紐づけ（employee, hr, hr_manager, developer, test）
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), r.app_role_id, 'a1b2c3d4-e5f6-7890-abcd-123456789002'::uuid
FROM (VALUES
  ('03c94882-88b0-4937-887b-c3733ab21028'::uuid),  -- employee
  ('f422469d-c1e0-4a10-ac6c-4b656b4fec64'::uuid),  -- hr
  ('c50ebd55-3466-43dc-a702-5d8321908d69'::uuid),  -- hr_manager
  ('74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid),  -- developer
  ('25d560ff-0166-49a5-b29c-24711664bd6d'::uuid)   -- test
) AS r(app_role_id)
WHERE EXISTS (SELECT 1 FROM public.app_role ar WHERE ar.id = r.app_role_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = r.app_role_id
      AND ars.service_id = 'a1b2c3d4-e5f6-7890-abcd-123456789002'::uuid
  );

INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, 'a1b2c3d4-e5f6-7890-abcd-123456789002'::uuid
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id
    AND ts.service_id = 'a1b2c3d4-e5f6-7890-abcd-123456789002'::uuid
);

-- 人事評価機能 テナント層テーブル群
-- テナント固有テンプレート・評価期間・評価シート・目標・スコア・ログ

-- ① テナント固有テンプレート（グローバルからコピー or 独自作成）
CREATE TABLE public.evaluation_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
  global_template_id    UUID REFERENCES public.global_evaluation_templates(id),
  -- NULL = テナントが独自作成 / NOT NULL = グローバルからコピー
  name                  TEXT NOT NULL,
  template_type         TEXT NOT NULL
    CHECK (template_type IN ('general', 'manager', 'parttime')),
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INT NOT NULL DEFAULT 0,
  copied_from_global_at TIMESTAMPTZ,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- ② テナント固有評価項目（カスタマイズ可）
CREATE TABLE public.evaluation_template_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
  template_id   UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  axis          TEXT NOT NULL
    CHECK (axis IN ('performance', 'ability', 'attitude', 'mbo')),
  mbo_category  TEXT
    CHECK (mbo_category IN ('A', 'B', 'C', 'D') OR mbo_category IS NULL),
  name          TEXT NOT NULL,
  description   TEXT,
  weight        NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_custom     BOOLEAN NOT NULL DEFAULT false,
  -- true = テナント独自追加項目（グローバルテンプレートにない項目）
  target_grades TEXT[] DEFAULT '{}',
  -- 対象グレードコード配列（空配列=全員対象）
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_template_items
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_template_items_template_id
  ON public.evaluation_template_items(template_id);

-- ③ 等級別評価基準（グレードごとにスコア1〜5の説明文を定義）
CREATE TABLE public.grade_evaluation_criteria (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  item_id      UUID NOT NULL REFERENCES public.evaluation_template_items(id) ON DELETE CASCADE,
  grade_code   TEXT NOT NULL,
  score_1_desc TEXT,
  score_2_desc TEXT,
  score_3_desc TEXT,
  score_4_desc TEXT,
  score_5_desc TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, grade_code)
);

ALTER TABLE public.grade_evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.grade_evaluation_criteria
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- ④ 評価期間
CREATE TABLE public.evaluation_periods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
  name               TEXT NOT NULL,
  fiscal_year        INT NOT NULL,
  period_type        TEXT NOT NULL
    CHECK (period_type IN ('first_half', 'second_half', 'full_year', 'quarterly')),
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  goal_deadline      DATE,
  self_eval_start    DATE,
  self_eval_end      DATE,
  primary_eval_end   DATE,
  secondary_eval_end DATE,
  status             TEXT NOT NULL DEFAULT 'preparation'
    CHECK (status IN (
      'preparation', 'goal_setting', 'in_progress', 'self_eval',
      'primary_eval', 'secondary_eval', 'confirmed', 'closed'
    )),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_periods
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- ⑤ 評価シート（従業員 × 評価期間 = 1シート）
CREATE TABLE public.evaluation_sheets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id),
  employee_id            UUID NOT NULL REFERENCES public.employees(id),
  period_id              UUID NOT NULL REFERENCES public.evaluation_periods(id),
  template_id            UUID NOT NULL REFERENCES public.evaluation_templates(id),
  -- 評価者はシート生成時に employee_approvers からスナップショット保存
  primary_evaluator_id   UUID REFERENCES public.employees(id),
  secondary_evaluator_id UUID REFERENCES public.employees(id),
  confirmer_id           UUID REFERENCES public.employees(id),
  flow_status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (flow_status IN (
      'draft',               -- 下書き（目標未設定）
      'goal_set',            -- 目標設定完了
      'self_eval',           -- 自己評価入力中
      'self_submitted',      -- 自己評価提出済
      'primary_eval',        -- 一次評価中
      'primary_submitted',   -- 一次評価提出済
      'secondary_eval',      -- 二次評価中
      'secondary_submitted', -- 二次評価提出済
      'confirming',          -- 確定者レビュー中
      'confirmed'            -- 確定（ロック済み）
    )),
  final_score NUMERIC(4,2),
  final_grade TEXT CHECK (final_grade IN ('S', 'A', 'B', 'C', 'D') OR final_grade IS NULL),
  is_locked   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_id)
);

ALTER TABLE public.evaluation_sheets ENABLE ROW LEVEL SECURITY;

-- RLS はテナント単位の基本分離のみ。フロー状態によるアクセス制御はアプリ層で実装する
CREATE POLICY "tenant_isolation" ON public.evaluation_sheets
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_sheets_employee_period ON public.evaluation_sheets(employee_id, period_id);
CREATE INDEX idx_eval_sheets_primary         ON public.evaluation_sheets(primary_evaluator_id);
CREATE INDEX idx_eval_sheets_secondary       ON public.evaluation_sheets(secondary_evaluator_id);
CREATE INDEX idx_eval_sheets_confirmer       ON public.evaluation_sheets(confirmer_id);

-- ⑥ MBO目標
CREATE TABLE public.evaluation_goals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id),
  sheet_id             UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  item_id              UUID REFERENCES public.evaluation_template_items(id),
  goal_title           TEXT NOT NULL,
  goal_detail          TEXT,
  kpi_type             TEXT NOT NULL DEFAULT 'quantitative'
    CHECK (kpi_type IN ('quantitative', 'qualitative')),
  kpi_target           TEXT,
  kpi_unit             TEXT,
  kpi_achieve_criteria TEXT,
  weight               NUMERIC(5,2) NOT NULL DEFAULT 0,
  deadline             DATE,
  sort_order           INT NOT NULL DEFAULT 0,
  approved_at          TIMESTAMPTZ,
  approved_by          UUID REFERENCES public.employees(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_goals
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_goals_sheet_id ON public.evaluation_goals(sheet_id);

-- ⑦ 評価スコア（3軸・MBOを同テーブルで管理）
CREATE TABLE public.evaluation_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
  sheet_id         UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  item_id          UUID REFERENCES public.evaluation_template_items(id),
  goal_id          UUID REFERENCES public.evaluation_goals(id),
  evaluator_type   TEXT NOT NULL
    CHECK (evaluator_type IN ('self', 'primary', 'secondary', 'confirmer')),
  score            INT CHECK (score BETWEEN 1 AND 5),
  achievement_rate NUMERIC(5,2),
  comment          TEXT,
  evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluator_id     UUID NOT NULL REFERENCES public.employees(id),
  -- item_id と goal_id のどちらか一方のみ設定する
  CHECK (
    (item_id IS NOT NULL AND goal_id IS NULL) OR
    (item_id IS NULL AND goal_id IS NOT NULL)
  )
);

ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_scores
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_scores_sheet_id ON public.evaluation_scores(sheet_id);

-- ⑧ フロー変更ログ（監査証跡）
CREATE TABLE public.evaluation_flow_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  sheet_id    UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID NOT NULL REFERENCES public.employees(id),
  comment     TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_flow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_flow_logs
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_flow_logs_sheet_id ON public.evaluation_flow_logs(sheet_id);

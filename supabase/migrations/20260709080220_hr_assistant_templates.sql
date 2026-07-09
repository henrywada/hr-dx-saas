-- =============================================================================
-- AI人事アシスタント: 質問テンプレート（Phase 1）
-- tenant_id が NULL の行は全テナント共通の seed テンプレート。
-- mined（週次マイニング生成）は Phase 3 で service_role が書き込む。
-- =============================================================================

CREATE TABLE public.tenant_hr_assistant_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  mode          text NOT NULL DEFAULT 'general'
                CHECK (mode IN ('general', 'labor_calc', 'comment_review', 'case_search')),
  question_text text NOT NULL,
  source        text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'mined')),
  usage_count   int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_hr_assistant_templates_tenant_idx
  ON public.tenant_hr_assistant_templates(tenant_id, mode, status);

ALTER TABLE public.tenant_hr_assistant_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: 共通 seed（tenant_id IS NULL）または自テナントの行のみ
CREATE POLICY "hr_assistant_templates_select" ON public.tenant_hr_assistant_templates
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- 書き込みポリシーは作らない（seed はマイグレーション、mined は service_role が担う。
-- usage_count の加算のみ下記 RPC で許可する）

-- usage_count 加算専用 RPC（行全体の UPDATE 権限を与えないため SECURITY DEFINER）
CREATE OR REPLACE FUNCTION public.increment_hr_template_usage(p_template_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tenant_hr_assistant_templates
  SET usage_count = usage_count + 1,
      updated_at  = now()
  WHERE id = p_template_id
    AND status = 'active'
    AND (
      tenant_id IS NULL
      OR tenant_id = (
        SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.increment_hr_template_usage(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_hr_template_usage(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- seed テンプレート 20 件（general 8 / labor_calc 6 / comment_review 3 / case_search 3）
-- ---------------------------------------------------------------------------
INSERT INTO public.tenant_hr_assistant_templates (tenant_id, mode, question_text, source) VALUES
  (NULL, 'general', '有給休暇の付与日数と繰越ルールを教えてください', 'seed'),
  (NULL, 'general', '従業員が退職する際に会社が行う手続きの一覧を教えてください', 'seed'),
  (NULL, 'general', '試用期間中の解雇にはどのような制約がありますか？', 'seed'),
  (NULL, 'general', '育児休業の取得条件と期間について教えてください', 'seed'),
  (NULL, 'general', '就業規則を変更する場合の手続きと注意点を教えてください', 'seed'),
  (NULL, 'general', '副業を許可する場合に整備すべき社内ルールを教えてください', 'seed'),
  (NULL, 'general', '休職中の従業員が復職する際の対応手順を教えてください', 'seed'),
  (NULL, 'general', 'ハラスメント相談を受けた際の初動対応を教えてください', 'seed'),
  (NULL, 'labor_calc', '月給30万円・所定労働時間160時間の場合の残業単価を計算してください', 'seed'),
  (NULL, 'labor_calc', '深夜残業の割増率と計算方法を教えてください', 'seed'),
  (NULL, 'labor_calc', '法定休日と所定休日の割増賃金の違いを計算例つきで教えてください', 'seed'),
  (NULL, 'labor_calc', '入社3年目・週5日勤務の従業員の有給付与日数を計算してください', 'seed'),
  (NULL, 'labor_calc', '欠勤控除の一般的な計算方法を教えてください', 'seed'),
  (NULL, 'labor_calc', '36協定の上限時間（月45時間・年360時間）の考え方を教えてください', 'seed'),
  (NULL, 'comment_review', '評価コメント「よく頑張っていた」を具体的な表現に添削してください', 'seed'),
  (NULL, 'comment_review', '低評価を伝えるコメントを建設的な表現に改善してください', 'seed'),
  (NULL, 'comment_review', 'この評価コメントに法的リスクのある表現がないか確認してください', 'seed'),
  (NULL, 'case_search', '遅刻を繰り返す従業員への対応事例はありますか？', 'seed'),
  (NULL, 'case_search', 'メンタル不調の従業員への対応事例を探しています', 'seed'),
  (NULL, 'case_search', '賃金に関する従業員からの不満への対応事例はありますか？', 'seed');

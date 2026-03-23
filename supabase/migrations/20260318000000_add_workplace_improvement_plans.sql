-- =============================================================================
-- 職場改善計画テーブル（ストレスチェック集団分析に基づくAI提案の管理）
-- =============================================================================
-- ※ stress_group_analysis は VIEW のため FK 参照不可
--    source_analysis_id は uuid で保持し、アプリ側で紐づけ管理
-- =============================================================================

CREATE TABLE IF NOT EXISTS workplace_improvement_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  division_id uuid REFERENCES divisions(id),                    -- NULL=全社向け提案
  source_analysis_id uuid,                                      -- VIEWはFK不可 → アプリ側で紐づけ用

  ai_generated_title text NOT NULL,
  ai_reason text NOT NULL,
  proposed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority text NOT NULL CHECK (priority IN ('高', '中', '低')),

  status text DEFAULT '提案済' CHECK (status IN ('提案済', '実行登録', '実施中', '完了', 'キャンセル')),
  registered_by uuid REFERENCES employees(id),
  expected_effect text,
  manual_ref text,

  follow_up_date date,                                           -- 3ヶ月後自動フォロー用
  actual_effect_score numeric,                                   -- フォロー調査後の効果点数

  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- インデックス（高速検索用）
CREATE INDEX idx_wip_tenant ON workplace_improvement_plans(tenant_id);
CREATE INDEX idx_wip_division ON workplace_improvement_plans(division_id);
CREATE INDEX idx_wip_status ON workplace_improvement_plans(status);

-- RLS（セキュリティ）
ALTER TABLE workplace_improvement_plans ENABLE ROW LEVEL SECURITY;

-- ※ current_tenant_id() を使用（auth.uid() は user_id に対応するため id=auth.uid() は誤り）
CREATE POLICY "wip_select_same_tenant" ON workplace_improvement_plans
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "wip_insert_same_tenant" ON workplace_improvement_plans
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "wip_update_same_tenant" ON workplace_improvement_plans
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "wip_delete_same_tenant" ON workplace_improvement_plans
  FOR DELETE USING (tenant_id = public.current_tenant_id());

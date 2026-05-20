-- テナント固有のスキルレベルセット（評価軸）。職種に依存せずテナント全体で共有する。

CREATE TABLE public.tenant_skill_level_sets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_skill_level_sets_tenant_name_key UNIQUE (tenant_id, name)
);

ALTER TABLE public.tenant_skill_level_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.tenant_skill_level_sets
  FOR ALL
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX tenant_skill_level_sets_tenant_id_idx ON public.tenant_skill_level_sets (tenant_id);

COMMENT ON TABLE public.tenant_skill_level_sets IS 'テナント固有のスキルレベルセット（評価軸）。職種に依存せずテナント全体で共有する。';

-- skill_levels にセット紐付けと criteria カラムを追加（既存データとの互換のため NULL 許容）
ALTER TABLE public.skill_levels
  ADD COLUMN skill_level_set_id UUID REFERENCES public.tenant_skill_level_sets(id) ON DELETE CASCADE,
  ADD COLUMN criteria TEXT;

CREATE INDEX skill_levels_skill_level_set_id_idx ON public.skill_levels (skill_level_set_id);

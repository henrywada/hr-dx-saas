-- 既存テーブルは一切変更しない。新規テーブルのみ追加。
-- 自動配信ルール（Web検索 → AI要約 → メール配信）機能

-- =========================================================
-- auto_distribution_rules — 配信ルール設定
-- =========================================================
CREATE TABLE public.auto_distribution_rules (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES public.tenants(id),
  name                   TEXT        NOT NULL,
  search_theme           TEXT        NOT NULL,
  target_urls            TEXT[],
  recipient_emails       TEXT[]      NOT NULL,
  max_articles           SMALLINT    NOT NULL DEFAULT 12
                         CHECK (max_articles BETWEEN 1 AND 50),
  schedule_type          TEXT        NOT NULL
                         CHECK (schedule_type IN ('weekly', 'monthly')),
  schedule_day_of_week   SMALLINT    CHECK (schedule_day_of_week BETWEEN 0 AND 6),
  schedule_day_of_month  SMALLINT    CHECK (schedule_day_of_month BETWEEN 1 AND 31),
  is_active              BOOLEAN     NOT NULL DEFAULT true,
  created_by             UUID        REFERENCES public.employees(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_schedule_fields CHECK (
    (schedule_type = 'weekly' AND schedule_day_of_week IS NOT NULL)
    OR
    (schedule_type = 'monthly' AND schedule_day_of_month IS NOT NULL)
  )
);

ALTER TABLE public.auto_distribution_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.auto_distribution_rules
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_auto_distribution_rules_tenant_active
  ON public.auto_distribution_rules(tenant_id, is_active);

CREATE TRIGGER trg_auto_distribution_rules_updated_at
  BEFORE UPDATE ON public.auto_distribution_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- auto_distribution_logs — 実行履歴
-- =========================================================
CREATE TABLE public.auto_distribution_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES public.tenants(id),
  rule_id        UUID        NOT NULL REFERENCES public.auto_distribution_rules(id) ON DELETE CASCADE,
  executed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  article_count  SMALLINT    NOT NULL DEFAULT 0,
  articles       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  error_message  TEXT,
  triggered_by   TEXT        NOT NULL DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual'))
);

ALTER TABLE public.auto_distribution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.auto_distribution_logs
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_auto_distribution_logs_rule_executed
  ON public.auto_distribution_logs(rule_id, executed_at DESC);

-- =========================================================
-- サイドバー登録（管理：ツールボックス カテゴリ）
-- =========================================================
INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES
  ('e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 950, '管理：ツールボックス', NULL, '公開')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c',
  'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
  '自動配信ルール',
  NULL,
  'Web検索AI要約レポート配信',
  '指定テーマでWebを定期検索し、AIが記事を要約・意見生成してメールへ配信するルールを管理',
  100,
  '/adm/auto-distribution',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 機能契約に依存しない汎用ツールのため、全テナントへ付与
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c'::uuid
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id AND ts.service_id = 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c'::uuid
);

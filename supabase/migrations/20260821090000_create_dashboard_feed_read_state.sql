-- /top 通知フィードの既読状態（system_notice 種別のみ対象。action_prompt はタスクが残るため対象外）
-- dedupe_key はプロバイダが決定する安定キー（例: announcement:{id}）で、DB行を持たない導出型アイテムの既読管理にも使う。

CREATE TABLE IF NOT EXISTS public.dashboard_feed_read_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dashboard_feed_read_state_employee_dedupe_key UNIQUE (employee_id, dedupe_key)
);

COMMENT ON TABLE public.dashboard_feed_read_state IS
  '/top 通知フィードの既読状態（従業員単位・dedupe_key単位）';

CREATE INDEX IF NOT EXISTS idx_dashboard_feed_read_state_tenant
  ON public.dashboard_feed_read_state (tenant_id);

ALTER TABLE public.dashboard_feed_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_read_state_select_own" ON public.dashboard_feed_read_state;
CREATE POLICY "feed_read_state_select_own"
  ON public.dashboard_feed_read_state FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

DROP POLICY IF EXISTS "feed_read_state_insert_own" ON public.dashboard_feed_read_state;
CREATE POLICY "feed_read_state_insert_own"
  ON public.dashboard_feed_read_state FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

DROP POLICY IF EXISTS "feed_read_state_update_own" ON public.dashboard_feed_read_state;
CREATE POLICY "feed_read_state_update_own"
  ON public.dashboard_feed_read_state FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

DROP POLICY IF EXISTS "feed_read_state_delete_own" ON public.dashboard_feed_read_state;
CREATE POLICY "feed_read_state_delete_own"
  ON public.dashboard_feed_read_state FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

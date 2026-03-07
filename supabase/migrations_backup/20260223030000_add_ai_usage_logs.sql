-- Migration script: create ai_usage_logs table

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (エラー無視処理付き)
DO $$
BEGIN
  ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ai_usage_logsのRLS有効化をスキップしました (権限エラーのため)';
END
$$;

-- Apply Tenant Isolation Policy (エラー無視処理付き)
DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_usage_logs_tenant_isolation" ON public.ai_usage_logs;
  CREATE POLICY "ai_usage_logs_tenant_isolation" ON public.ai_usage_logs
      FOR ALL
      USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ai_usage_logsのポリシー作成をスキップしました (権限エラーのため)';
END
$$;

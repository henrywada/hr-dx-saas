-- Echo専用の purpose カラムを questionnaires に追加
ALTER TABLE public.questionnaires
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'general'
  CHECK (purpose IN ('general', 'echo'));

-- SaaS管理者（app_role='developer'）がシステムテンプレートを操作できるRLSポリシー追加
-- system templates は tenant_id IS NULL のため既存テナント向けポリシーでは操作不可
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'questionnaires'
      AND policyname = 'saas_admin_manage_system_templates'
  ) THEN
    CREATE POLICY "saas_admin_manage_system_templates"
      ON public.questionnaires
      FOR ALL
      USING (
        creator_type = 'system'
        AND public.current_employee_app_role() = 'developer'
      );
  END IF;
END $$;

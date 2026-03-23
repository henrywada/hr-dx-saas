-- テレワーク端末ペアリング用カラム + 人事向け SELECT RLS（DROP/TRUNCATE なし）

ALTER TABLE public.telework_pc_devices
  ADD COLUMN IF NOT EXISTS registration_token_hash text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS secret_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS secret_delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.telework_pc_devices.registration_token_hash IS '登録時ワンタイムトークンの SHA-256(hex)。平文トークンは端末のみ保持';
COMMENT ON COLUMN public.telework_pc_devices.secret_issued_at IS 'device_secret を暗号化保存した時刻';
COMMENT ON COLUMN public.telework_pc_devices.secret_delivered_at IS '平文 secret を端末へ一度返却済みの時刻';

-- 人事: 同一テナント内の全 telework_pc_devices を参照可能（既存ポリシーと OR）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'telework_pc_devices' AND policyname = 'tw_devices_hr_select'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY tw_devices_hr_select
      ON public.telework_pc_devices
      FOR SELECT
      TO authenticated
      USING (
        tenant_id = public.current_tenant_id()
        AND public.current_employee_app_role() IN ('hr', 'hr_manager')
      );
    $sql$;
  END IF;
END$$;

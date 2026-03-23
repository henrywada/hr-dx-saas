-- テレワーク出退勤・PCログ・集計・監査（マルチテナント + RLS）
-- 既存データを壊さないため CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS のみ（DROP/TRUNCATE なし）

CREATE TABLE IF NOT EXISTS public.telework_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  device_id uuid,
  start_at timestamptz NOT NULL,
  start_lat numeric,
  start_lon numeric,
  start_ip inet,
  start_user_agent text,
  end_at timestamptz,
  end_lat numeric,
  end_lon numeric,
  end_ip inet,
  end_user_agent text,
  worked_seconds integer,
  status text DEFAULT 'open', -- open/closed/review_required
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telework_pc_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  device_name text,
  device_identifier text, -- ハードウェアID等（暗号化保存推奨）
  device_secret text, -- 暗号化保存（pgcrypto 推奨）
  registered_at timestamptz DEFAULT now(),
  approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  last_seen timestamptz,
  metadata jsonb
);

CREATE TABLE IF NOT EXISTS public.telework_pc_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  device_id uuid,
  event_time timestamptz NOT NULL,
  event_type text NOT NULL, -- login/logout, sleep_start, sleep_end, lock, unlock, heartbeat, activity
  info jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telework_activity_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  date date NOT NULL,
  active_seconds integer DEFAULT 0,
  pc_active_seconds integer DEFAULT 0,
  idle_seconds integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE (tenant_id, user_id, date)
);

CREATE TABLE IF NOT EXISTS public.telework_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  related_table text,
  related_id uuid,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tw_sessions_tenant_user ON public.telework_sessions (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tw_devices_tenant_user ON public.telework_pc_devices (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tw_logs_tenant_user ON public.telework_pc_logs (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tw_logs_tenant_event_time ON public.telework_pc_logs (tenant_id, event_time);
CREATE INDEX IF NOT EXISTS idx_tw_stats_tenant_user_date ON public.telework_activity_stats (tenant_id, user_id, date);
CREATE INDEX IF NOT EXISTS idx_tw_audit_tenant_created ON public.telework_audit_logs (tenant_id, created_at DESC);

COMMENT ON TABLE public.telework_sessions IS 'テレワーク出退勤セッション（テナント単位）';
COMMENT ON TABLE public.telework_pc_devices IS 'テレワーク用PC端末登録（テナント単位）';
COMMENT ON TABLE public.telework_pc_logs IS 'PCイベントログ（テナント単位）';
COMMENT ON TABLE public.telework_activity_stats IS '日次アクティビティ集計（テナント・ユーザー単位）';
COMMENT ON TABLE public.telework_audit_logs IS 'テレワーク機能の監査ログ（テナント単位）';

-- RLS: telework_sessions
ALTER TABLE IF EXISTS public.telework_sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_sessions' AND policyname='tw_sessions_select') THEN
    EXECUTE $sql$
      CREATE POLICY tw_sessions_select
      ON public.telework_sessions
      FOR SELECT
      TO authenticated
      USING (tenant_id = public.current_tenant_id());
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_sessions' AND policyname='tw_sessions_insert') THEN
    EXECUTE $sql$
      CREATE POLICY tw_sessions_insert
      ON public.telework_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_sessions' AND policyname='tw_sessions_update') THEN
    EXECUTE $sql$
      CREATE POLICY tw_sessions_update
      ON public.telework_sessions
      FOR UPDATE
      TO authenticated
      USING (tenant_id = public.current_tenant_id() AND auth.uid() = user_id)
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

-- RLS: telework_pc_devices
ALTER TABLE IF EXISTS public.telework_pc_devices ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_pc_devices' AND policyname='tw_devices_select') THEN
    EXECUTE $sql$
      CREATE POLICY tw_devices_select
      ON public.telework_pc_devices
      FOR SELECT
      TO authenticated
      USING (tenant_id = public.current_tenant_id() AND (approved = true OR auth.uid() = user_id));
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_pc_devices' AND policyname='tw_devices_insert') THEN
    EXECUTE $sql$
      CREATE POLICY tw_devices_insert
      ON public.telework_pc_devices
      FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_pc_devices' AND policyname='tw_devices_update') THEN
    EXECUTE $sql$
      CREATE POLICY tw_devices_update
      ON public.telework_pc_devices
      FOR UPDATE
      TO authenticated
      USING (tenant_id = public.current_tenant_id() AND auth.uid() = user_id)
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

-- RLS: telework_pc_logs
ALTER TABLE IF EXISTS public.telework_pc_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_pc_logs' AND policyname='tw_logs_select') THEN
    EXECUTE $sql$
      CREATE POLICY tw_logs_select
      ON public.telework_pc_logs
      FOR SELECT
      TO authenticated
      USING (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_pc_logs' AND policyname='tw_logs_insert') THEN
    EXECUTE $sql$
      CREATE POLICY tw_logs_insert
      ON public.telework_pc_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

-- RLS: telework_activity_stats（本人行のみ）
ALTER TABLE IF EXISTS public.telework_activity_stats ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_activity_stats' AND policyname='tw_stats_select') THEN
    EXECUTE $sql$
      CREATE POLICY tw_stats_select
      ON public.telework_activity_stats
      FOR SELECT
      TO authenticated
      USING (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_activity_stats' AND policyname='tw_stats_insert') THEN
    EXECUTE $sql$
      CREATE POLICY tw_stats_insert
      ON public.telework_activity_stats
      FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_activity_stats' AND policyname='tw_stats_update') THEN
    EXECUTE $sql$
      CREATE POLICY tw_stats_update
      ON public.telework_activity_stats
      FOR UPDATE
      TO authenticated
      USING (tenant_id = public.current_tenant_id() AND auth.uid() = user_id)
      WITH CHECK (tenant_id = public.current_tenant_id() AND auth.uid() = user_id);
    $sql$;
  END IF;
END$$;

-- RLS: telework_audit_logs（テナント内の参照・記録。actor は本人または NULL）
ALTER TABLE IF EXISTS public.telework_audit_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_audit_logs' AND policyname='tw_audit_select') THEN
    EXECUTE $sql$
      CREATE POLICY tw_audit_select
      ON public.telework_audit_logs
      FOR SELECT
      TO authenticated
      USING (tenant_id = public.current_tenant_id());
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telework_audit_logs' AND policyname='tw_audit_insert') THEN
    EXECUTE $sql$
      CREATE POLICY tw_audit_insert
      ON public.telework_audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
      );
    $sql$;
  END IF;
END$$;

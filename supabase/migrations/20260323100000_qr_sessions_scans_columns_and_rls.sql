-- qr_sessions / qr_session_scans の不足カラム補完と RLS ポリシー（qr_audit_logs と同方針）
-- 既存行は保持（DROP/TRUNCATE なし）。CREATE POLICY IF NOT EXISTS は未対応のため DO + pg_policies で分岐。

-- =============================================================================
-- 1. カラム追加（存在時はスキップ）
-- =============================================================================
-- 注: 既存行があるテーブルに NOT NULL かつ DEFAULT なしの列を足すと失敗するため、
--     必須系は NULL 許可で追加する。データ投入後にアプリ側または別途 ALTER で NOT NULL 化可能。

ALTER TABLE public.qr_sessions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS supervisor_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS nonce text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS max_uses int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uses int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.qr_session_scans
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS employee_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS device_info jsonb,
  ADD COLUMN IF NOT EXISTS location jsonb,
  ADD COLUMN IF NOT EXISTS proximity jsonb,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS photo_hash text,
  ADD COLUMN IF NOT EXISTS supervisor_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_method text,
  ADD COLUMN IF NOT EXISTS result text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audit jsonb DEFAULT '{}'::jsonb;

-- session_id の FK（テーブルが既に存在する前提。列のみ先行作成されていた環境向け）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'qr_session_scans'
      AND c.conname = 'qr_session_scans_session_id_fkey'
  ) THEN
    ALTER TABLE public.qr_session_scans
      ADD CONSTRAINT qr_session_scans_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.qr_sessions(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 元マイグレーションと同じユニーク・検索用インデックス（未作成環境向け）
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_sessions_tenant_nonce ON public.qr_sessions(tenant_id, nonce);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_tenant_supervisor ON public.qr_sessions(tenant_id, supervisor_user_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires_at ON public.qr_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_scans_session_id ON public.qr_session_scans(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_employee ON public.qr_session_scans(tenant_id, employee_user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_session_scans(scanned_at);

-- =============================================================================
-- 2. RLS 有効化
-- =============================================================================
ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_session_scans ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. ポリシー（qr_audit_logs と同様: current_tenant_id + authenticated）
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_sessions' AND policyname = 'qr_sessions_tenant_select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_sessions_tenant_select"
        ON public.qr_sessions FOR SELECT TO authenticated
        USING (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_sessions' AND policyname = 'qr_sessions_tenant_insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_sessions_tenant_insert"
        ON public.qr_sessions FOR INSERT TO authenticated
        WITH CHECK (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_sessions' AND policyname = 'qr_sessions_tenant_update'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_sessions_tenant_update"
        ON public.qr_sessions FOR UPDATE TO authenticated
        USING (tenant_id = public.current_tenant_id())
        WITH CHECK (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_sessions' AND policyname = 'qr_sessions_tenant_delete'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_sessions_tenant_delete"
        ON public.qr_sessions FOR DELETE TO authenticated
        USING (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_session_scans' AND policyname = 'qr_session_scans_tenant_select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_session_scans_tenant_select"
        ON public.qr_session_scans FOR SELECT TO authenticated
        USING (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_session_scans' AND policyname = 'qr_session_scans_tenant_insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_session_scans_tenant_insert"
        ON public.qr_session_scans FOR INSERT TO authenticated
        WITH CHECK (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_session_scans' AND policyname = 'qr_session_scans_tenant_update'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_session_scans_tenant_update"
        ON public.qr_session_scans FOR UPDATE TO authenticated
        USING (tenant_id = public.current_tenant_id())
        WITH CHECK (tenant_id = public.current_tenant_id())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_session_scans' AND policyname = 'qr_session_scans_tenant_delete'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "qr_session_scans_tenant_delete"
        ON public.qr_session_scans FOR DELETE TO authenticated
        USING (tenant_id = public.current_tenant_id())
    $p$;
  END IF;
END $$;

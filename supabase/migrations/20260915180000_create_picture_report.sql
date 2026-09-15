-- 20260915180000_create_picture_report.sql
--
-- 画像送信（写真レポート）機能: 現場から撮影した写真に件名・本文・優先度を
-- 添えて送信し、履歴をアルバムとして振り返れる機能。
-- 移植元: dx-sensor（シングルテナント版）の picture_send_subjects / picture_sends。
-- hr-dx-saas向けに tenant_id によるテナント分離、division_id による部門共有・
-- マネージャー閲覧権限を追加する。
-- 参照: docs/superpowers/specs/2026-09-15-picture-report-migration-design.md

-- ============================================================
-- 0. ヘルパー関数（current_tenant_id() と同じ SECURITY DEFINER パターン）
-- ============================================================
-- employees 自身の RLS への再帰を避けるため SECURITY DEFINER にする。
-- STABLE なのでプランナが同一トランザクション内の結果をキャッシュできる。

CREATE OR REPLACE FUNCTION public.current_employee_division_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.division_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_employee_is_manager()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(e.is_manager, false)
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

-- ============================================================
-- 1. picture_send_subjects（件名マスタ・部門単位で共有）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.picture_send_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (division_id, label)
);

COMMENT ON TABLE public.picture_send_subjects IS
  '画像送信で繰り返し使う件名マスタ。部門単位で共有し、マネージャーのみ編集できる。';

ALTER TABLE public.picture_send_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "picture_send_subjects_select_own_division" ON public.picture_send_subjects
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND division_id = public.current_employee_division_id()
  );

CREATE POLICY "picture_send_subjects_write_manager_only" ON public.picture_send_subjects
  FOR ALL USING (
    tenant_id = public.current_tenant_id()
    AND division_id = public.current_employee_division_id()
    AND public.current_employee_is_manager()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND division_id = public.current_employee_division_id()
    AND public.current_employee_is_manager()
  );

CREATE INDEX IF NOT EXISTS picture_send_subjects_division_idx
  ON public.picture_send_subjects (division_id, label);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.picture_send_subjects TO authenticated;

-- ============================================================
-- 2. picture_sends（投稿レコード）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.picture_sends (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id  UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  user_email   TEXT NOT NULL,
  subject_id   UUID REFERENCES public.picture_send_subjects(id) ON DELETE SET NULL,
  subject_text TEXT NOT NULL,
  body_text    TEXT NOT NULL DEFAULT '',
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.picture_sends IS
  '画像送信の記録。division_id は投稿当時の所属部門を固定で保存する（異動後もマネージャー閲覧範囲は投稿当時の部門で判定する）。';

ALTER TABLE public.picture_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "picture_sends_select_own_or_manager" ON public.picture_sends
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR (
        division_id = public.current_employee_division_id()
        AND public.current_employee_is_manager()
      )
    )
  );

CREATE POLICY "picture_sends_insert_own" ON public.picture_sends
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id() AND user_id = auth.uid()
  );

CREATE POLICY "picture_sends_update_own" ON public.picture_sends
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "picture_sends_delete_own" ON public.picture_sends
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS picture_sends_user_created_idx
  ON public.picture_sends (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS picture_sends_division_created_idx
  ON public.picture_sends (division_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.picture_sends TO authenticated;

-- ============================================================
-- 3. Storage バケット + RLS
-- ============================================================
-- パス規約 {user_id}/{yyyy-mm-dd}/{uuid}.jpg は dx-sensor版を踏襲。
-- SELECT のみ、同一部門のマネージャーが picture_sends 経由で閲覧できるよう拡張する。

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'picture-sends', 'picture-sends', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "picture_sends_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'picture-sends'
    AND (
      (storage.foldername(name))[1]::uuid = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.picture_sends ps
        WHERE ps.storage_path = name
          AND ps.division_id = public.current_employee_division_id()
          AND public.current_employee_is_manager()
      )
    )
  );

CREATE POLICY "picture_sends_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'picture-sends' AND (storage.foldername(name))[1]::uuid = auth.uid()
  );

CREATE POLICY "picture_sends_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'picture-sends' AND (storage.foldername(name))[1]::uuid = auth.uid()
  );

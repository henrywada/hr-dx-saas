-- リモートに未作成の announcements テーブルを先行確保する。
-- 20260314000000 が未適用のまま 20260630150100 の ALTER が失敗する場合の救済。

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_new boolean NOT NULL DEFAULT true,
  target_audience text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.announcements IS '人事からのお知らせ（テナント単位）';
COMMENT ON COLUMN public.announcements.target_audience IS '対象（例: 全社員対象）';
COMMENT ON COLUMN public.announcements.is_new IS 'NEW バッジ表示するか';

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_tenant_select" ON public.announcements;
CREATE POLICY "announcements_tenant_select"
  ON public.announcements FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "announcements_tenant_insert" ON public.announcements;
CREATE POLICY "announcements_tenant_insert"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "announcements_tenant_update" ON public.announcements;
CREATE POLICY "announcements_tenant_update"
  ON public.announcements FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "announcements_tenant_delete" ON public.announcements;
CREATE POLICY "announcements_tenant_delete"
  ON public.announcements FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

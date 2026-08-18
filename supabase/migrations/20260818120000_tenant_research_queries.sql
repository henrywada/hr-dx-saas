-- =============================================================================
-- 「調べる」機能の検索履歴
--
-- /adm/research でのキーワード検索を記録し、履歴からの再実行を可能にする。
-- 取得した法令・通達の本文は保存しない（常に一次情報を取りに行き、
-- 古いキャッシュを見せないため）。記録するのは検索条件と件数のみ。
--
-- tenant_id は ON DELETE CASCADE。テナント削除時の取り残しを防ぐ。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_research_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('tax', 'labor', 'law')),
  sub_tab TEXT NOT NULL,
  keyword TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_research_queries IS '「調べる」機能の検索履歴（検索条件のみ。原文は保存しない）';

CREATE INDEX IF NOT EXISTS idx_tenant_research_queries_tenant_created
  ON public.tenant_research_queries (tenant_id, created_at DESC);

ALTER TABLE public.tenant_research_queries ENABLE ROW LEVEL SECURITY;

-- テナント分離は既存ヘルパー current_tenant_id() を使う。
-- この関数は STABLE SECURITY DEFINER + SET search_path = public で定義されており、
-- 中身は「employees から user_id = auth.uid() の tenant_id を1件引く」。
-- SECURITY DEFINER のため employees 自身の RLS に対する再帰を避けられ、
-- STABLE のためプランナが結果をキャッシュできる。
CREATE POLICY "tenant_isolation" ON public.tenant_research_queries
  FOR ALL USING (tenant_id = public.current_tenant_id());

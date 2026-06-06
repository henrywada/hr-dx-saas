-- NEW-3 採用ブランディング支援: AIバリアント保存テーブルを追加
-- 既存テーブル・データへの影響なし（ADD COLUMN IF NOT EXISTS / 新規テーブルのみ）

-- 媒体別AIバリアント保存テーブル
CREATE TABLE public.job_posting_ai_variants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_posting_id  UUID        REFERENCES public.job_postings(id) ON DELETE CASCADE,
  media_type      TEXT        NOT NULL CHECK (media_type IN ('indeed', 'linkedin', 'hellowork', 'company_site')),
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  differentiation_points TEXT,
  prompt_snapshot JSONB,
  is_applied      BOOLEAN     NOT NULL DEFAULT false,
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS有効化（必須 — テナント分離のため）
ALTER TABLE public.job_posting_ai_variants ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー（自テナントのデータのみ操作可能）
CREATE POLICY "tenant_isolation" ON public.job_posting_ai_variants
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE user_id = auth.uid()
    )
  );

-- インデックス
CREATE INDEX idx_ai_variants_job_posting ON public.job_posting_ai_variants(job_posting_id);
CREATE INDEX idx_ai_variants_tenant      ON public.job_posting_ai_variants(tenant_id, created_at DESC);

-- tenants テーブルへの追加カラム（既存データへの影響なし）
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS industry              TEXT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS founding_year         SMALLINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recruitment_strengths TEXT     DEFAULT NULL;

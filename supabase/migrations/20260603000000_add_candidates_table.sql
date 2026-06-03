-- 採用ファネルダッシュボード用 候補者管理テーブル（P1-A）
-- 既存テーブルへの影響なし。candidates テーブルの新規追加のみ。
-- candidate_pulses（感情調査）とは責務が異なるため別テーブルとして管理する。

-- ============================================================
-- 1. candidates テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_posting_id  UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  name            text NOT NULL,
  email           text,
  phone           text,
  -- ファネルステージ（固定値で集計を安定させる）
  stage           text NOT NULL DEFAULT 'applied'
    CONSTRAINT candidates_stage_check CHECK (stage IN (
      'applied',      -- 応募
      'screening',    -- 書類選考
      'interview_1',  -- 一次面接
      'interview_2',  -- 二次面接
      'final',        -- 最終面接
      'offered',      -- 内定
      'hired',        -- 入社
      'rejected',     -- 不採用
      'withdrawn'     -- 辞退
    )),
  assigned_to     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  last_action_at  timestamptz NOT NULL DEFAULT NOW(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. パフォーマンス用インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS candidates_tenant_id_idx
  ON public.candidates (tenant_id);

CREATE INDEX IF NOT EXISTS candidates_tenant_stage_idx
  ON public.candidates (tenant_id, stage);

CREATE INDEX IF NOT EXISTS candidates_last_action_at_idx
  ON public.candidates (last_action_at);

CREATE INDEX IF NOT EXISTS candidates_assigned_to_idx
  ON public.candidates (assigned_to);

-- ============================================================
-- 3. RLS（行レベルセキュリティ）
-- ============================================================
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー：自テナントの候補者のみ操作可能
-- 他テーブルに倣い current_tenant_id() 関数を使用する
CREATE POLICY "candidates_tenant_isolation"
  ON public.candidates
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ============================================================
-- 4. updated_at / last_action_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_candidate_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  -- stage が変更されたときのみ last_action_at を更新
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.last_action_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER candidates_update_timestamps
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_candidate_timestamps();

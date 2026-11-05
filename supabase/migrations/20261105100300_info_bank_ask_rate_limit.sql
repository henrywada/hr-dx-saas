-- =============================================================================
-- 社内AI情報バンク: 質問の回数制限（ユーザーごとの直近 N 秒あたりの上限）
--
-- Gemini の API キーは全テナントで共有のため、1 人の連続呼び出しが他機能の枠を使い切らないようにする。
-- 外部サービスを使わず DB で数える（無料プラン前提）。
-- 記録テーブルは直接読み書きさせず、SECURITY DEFINER の関数経由でのみ更新する。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.info_bank_ask_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS info_bank_ask_logs_user_created_idx
  ON public.info_bank_ask_logs (user_id, created_at DESC);

COMMENT ON TABLE public.info_bank_ask_logs IS '社内AI情報バンクの質問の記録（回数制限の集計用。1 日より古い行は関数内で削除する）';

ALTER TABLE public.info_bank_ask_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.info_bank_ask_logs FROM anon, authenticated;

-- 質問 1 回分の枠を消費する。枠が残っていれば記録して true、上限なら記録せず false。
-- 同じユーザーの同時実行は advisory lock で直列化するため、連打しても上限を超えない。
CREATE OR REPLACE FUNCTION public.try_consume_info_bank_ask(
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_recent integer;
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL THEN
    RETURN false;
  END IF;
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION '制限値が不正です';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  -- 自分の 1 日より古い記録だけを掃除する（テーブルの肥大化防止）
  DELETE FROM public.info_bank_ask_logs
  WHERE user_id = v_user AND created_at < now() - interval '1 day';

  SELECT count(*) INTO v_recent
  FROM public.info_bank_ask_logs
  WHERE user_id = v_user
    AND created_at > now() - make_interval(secs => p_window_seconds);

  IF v_recent >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.info_bank_ask_logs (tenant_id, user_id) VALUES (v_tenant, v_user);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.try_consume_info_bank_ask(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.try_consume_info_bank_ask(integer, integer) TO authenticated;

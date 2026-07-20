-- =============================================================================
-- 法令ナレッジの掃除処理
--
-- 背景:
--   チャンクを削除しているのは freshness.ts の内容差し替え時のみで、
--   expire_hr_law_documents() は status を 'expired' にするだけだった。
--   検索は status = 'published' で絞るため検索結果は汚れないが、
--   失効・無効化した文書のチャンクが削除されず溜まり続けていた。
-- =============================================================================

-- 検索対象外（expired / disabled）になった文書のチャンクを削除する。
-- 文書本体と detail は残すため、再公開時は再チャンクすれば復旧できる。
CREATE OR REPLACE FUNCTION public.cleanup_hr_law_unsearchable_chunks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.hr_law_chunks c
  USING public.hr_law_documents d
  WHERE d.id = c.document_id
    AND d.status IN ('expired', 'disabled');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_hr_law_unsearchable_chunks IS
  '検索対象外（expired/disabled）の文書のチャンクを削除する。週次ジョブから呼び出す';

REVOKE ALL ON FUNCTION public.cleanup_hr_law_unsearchable_chunks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_hr_law_unsearchable_chunks() TO service_role;

-- ---------------------------------------------------------------------------
-- オンデマンド収集の重複防止（source_url の重複を検出しやすくする）
--
-- content_hash は週次ジョブが本文ハッシュ、オンデマンドがURLハッシュを入れるため
-- 一意制約だけでは同一URLの重複を防げない。まず可視化できるようインデックスを張る。
-- （既存の重複データを壊さないよう UNIQUE ではなく通常インデックスにする）
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS hr_law_documents_source_url_idx
  ON public.hr_law_documents (source_url);

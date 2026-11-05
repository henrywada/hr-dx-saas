-- =============================================================================
-- 社内AI情報バンク: レビュー指摘の反映（権限・入力上限・ベクトル検索の再現率・列の公開範囲）
--
-- 20261105100000_info_bank_schema.sql に対する追加の硬化。DROP / データ削除は行わない。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. テーブル権限: 既定権限(ALTER DEFAULT PRIVILEGES)で anon / authenticated に付く ALL を外す。
--    書き込みは service_role のみ、閲覧は authenticated の SELECT のみ（RLS と二重に担保する）。
--    従業員から見えて困る列（取り込み中の版の情報・エラー詳細・Storage パス・作成者）は
--    列単位の SELECT 権限から外す。管理画面はサーバー側で service_role から読む。
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.info_bank_documents FROM anon, authenticated;
REVOKE ALL ON public.info_bank_chunks FROM anon, authenticated;

GRANT SELECT (
  id, tenant_id, title, category, tags, keywords, summary,
  original_filename, mime_type, byte_size, revision, published_at,
  created_at, updated_at
) ON public.info_bank_documents TO authenticated;

GRANT SELECT ON public.info_bank_chunks TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. 検索 RPC: 入力に上限を設け、anon から呼べないようにする
-- -----------------------------------------------------------------------------

-- 語は先頭 10 件・各 100 文字まで。前後の空白を除いた値で照合し、重複は 1 つにまとめる。
-- 件数は 1〜50 に丸める（NULL は 6）。
CREATE OR REPLACE FUNCTION public.search_info_bank_text(
  p_terms text[],
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  score double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH pats AS (
    SELECT DISTINCT
      '%' || replace(replace(replace(left(trim(t), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pat
    FROM (
      SELECT u.t
      FROM unnest(COALESCE(p_terms, ARRAY[]::text[])) WITH ORDINALITY AS u(t, n)
      WHERE length(trim(u.t)) > 0
      ORDER BY u.n
      LIMIT 10
    ) AS limited
  ),
  scored AS (
    SELECT
      c.id AS chunk_id,
      c.document_id,
      d.title,
      c.content,
      c.chunk_index,
      (SELECT count(*) FROM pats p WHERE c.content ILIKE p.pat) AS content_hits,
      (
        SELECT count(*) FROM pats p
        WHERE (d.title || ' ' || array_to_string(d.keywords, ' ') || ' ' || array_to_string(d.tags, ' '))
              ILIKE p.pat
      ) AS meta_hits
    FROM public.info_bank_chunks c
    JOIN public.info_bank_documents d
      ON d.id = c.document_id AND d.revision = c.revision
    WHERE c.tenant_id = public.current_tenant_id()
      AND d.tenant_id = c.tenant_id
      AND d.published_at IS NOT NULL
  )
  SELECT
    s.chunk_id,
    s.document_id,
    s.title,
    s.content,
    (s.content_hits + s.meta_hits * 0.5)::double precision AS score
  FROM scored s
  WHERE s.content_hits > 0 OR (s.meta_hits > 0 AND s.chunk_index < 3)
  ORDER BY score DESC, s.chunk_index
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 50);
$$;

-- ベクトル検索（コサイン類似度）。
-- HNSW は近似検索で WHERE をインデックス取得後に適用するため、他テナントや旧版のチャンクが
-- 候補を占めると自テナントの結果が欠ける（最悪 0 件）。関数単位で hnsw.iterative_scan を
-- 指定する方法は migration 実行ロールの権限では設定できないため、ORDER BY の式を
-- インデックスが使えない形（+ 0）にして、テナント内の厳密検索に統一する。
-- 無料プランの規模（テナントあたり数万チャンク以下）では十分高速で、結果が常に正確になる。
CREATE OR REPLACE FUNCTION public.match_info_bank_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 6
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT m.chunk_id, m.document_id, m.title, m.content, m.similarity
  FROM (
    SELECT
      c.id AS chunk_id,
      c.document_id,
      d.title,
      c.content,
      (1 - (c.embedding <=> query_embedding))::double precision AS similarity
    FROM public.info_bank_chunks c
    JOIN public.info_bank_documents d
      ON d.id = c.document_id AND d.revision = c.revision
    WHERE c.tenant_id = public.current_tenant_id()
      AND d.tenant_id = c.tenant_id
      AND d.published_at IS NOT NULL
      AND c.embedding IS NOT NULL
    ORDER BY (c.embedding <=> query_embedding) + 0
    LIMIT LEAST(GREATEST(COALESCE(match_count, 6), 1), 50)
  ) AS m
  ORDER BY m.similarity DESC;
$$;

REVOKE ALL ON FUNCTION public.search_info_bank_text(text[], integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_info_bank_chunks(vector(1536), integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_info_bank_chunks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_info_bank_text(text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_info_bank_chunks(vector(1536), integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_info_bank_chunks() TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. 版の公開: anon を含めて service_role 以外の実行権限を外し、版番号の巻き戻しを拒否する
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_info_bank_revision(
  p_document_id uuid,
  p_revision integer
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_doc public.info_bank_documents%ROWTYPE;
  v_total integer;
  v_unembedded integer;
BEGIN
  SELECT * INTO v_doc
  FROM public.info_bank_documents
  WHERE id = p_document_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '資料が見つかりません: %', p_document_id;
  END IF;
  IF v_doc.pending_revision IS DISTINCT FROM p_revision THEN
    RAISE EXCEPTION '取り込み中の版ではありません（pending=%, 指定=%）', v_doc.pending_revision, p_revision;
  END IF;
  IF p_revision <= v_doc.revision THEN
    RAISE EXCEPTION '公開中の版（%）以前の版には切り替えられません（指定=%）', v_doc.revision, p_revision;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE embedding IS NULL)
    INTO v_total, v_unembedded
  FROM public.info_bank_chunks
  WHERE document_id = p_document_id AND revision = p_revision;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'チャンクが 0 件のため公開できません';
  END IF;
  IF v_unembedded > 0 THEN
    RAISE EXCEPTION '埋め込みが未完了のチャンクが % 件あります', v_unembedded;
  END IF;

  UPDATE public.info_bank_documents
  SET revision = p_revision,
      published_at = COALESCE(published_at, now()),
      original_filename = pending_filename,
      mime_type = pending_mime_type,
      byte_size = pending_byte_size,
      storage_path = pending_storage_path,
      pending_revision = NULL,
      pending_filename = NULL,
      pending_mime_type = NULL,
      pending_byte_size = NULL,
      pending_storage_path = NULL,
      status = 'ready',
      error_message = NULL,
      updated_at = now()
  WHERE id = p_document_id;

  DELETE FROM public.info_bank_chunks
  WHERE document_id = p_document_id AND revision <> p_revision;

  RETURN v_doc.storage_path;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_info_bank_revision(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_info_bank_revision(uuid, integer) TO service_role;

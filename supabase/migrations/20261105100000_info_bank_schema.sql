-- =============================================================================
-- 社内AI情報バンク（テナント内の資料だけを対象にしたテキスト検索 + RAG 検索）
--
-- 設計メモ
-- - 既存の tenant_rag_*（人事ロール限定のお問合せチャット用）とは分離する。
--   情報バンクは従業員全員が検索でき、資料の改訂（入れ替え）を扱うため。
-- - 改訂は revision 番号で管理する。
--     documents.revision         … 公開中の版（0 = まだ公開されていない）
--     documents.pending_revision … 取り込み中の次の版（NULL = 取り込み中の版なし）
--   新しい版のチャンクを全件埋め込み済みにしてから publish_info_bank_revision() で切り替える
--   ため、取り込みに失敗しても旧版は検索できる状態のまま残る。
-- - 書き込みはすべてサーバー側（service_role）から行う。クライアント(authenticated)向けの
--   書き込みポリシーは作らない（RLS 有効 + ポリシー無し = 書き込み不可）。
-- - Storage バケットは非公開。アップロードは署名付きURL、閲覧はサーバーが発行する
--   署名付きURLで行うため、storage.objects のポリシーは作らない。
-- - ベクトルインデックスは HNSW（空テーブルでも作成でき、ivfflat のような再構築が不要）。
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.info_bank_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'その他',
  tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  -- 公開中の版のファイル情報（公開前は NULL）
  original_filename text,
  mime_type text,
  byte_size bigint,
  storage_path text,
  revision integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  -- 取り込み中の版のファイル情報
  pending_revision integer,
  pending_filename text,
  pending_mime_type text,
  pending_byte_size bigint,
  pending_storage_path text,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS info_bank_documents_tenant_idx
  ON public.info_bank_documents (tenant_id);

CREATE TABLE IF NOT EXISTS public.info_bank_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.info_bank_documents(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  -- 取り込みの 1 段階目では NULL。2 段階目（埋め込み）で埋める
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, revision, chunk_index)
);

CREATE INDEX IF NOT EXISTS info_bank_chunks_tenant_doc_idx
  ON public.info_bank_chunks (tenant_id, document_id, revision);
CREATE INDEX IF NOT EXISTS info_bank_chunks_content_trgm_idx
  ON public.info_bank_chunks USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS info_bank_chunks_embedding_hnsw_idx
  ON public.info_bank_chunks USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE public.info_bank_documents IS '社内AI情報バンクの資料（公開中の版 revision と取り込み中の版 pending_revision を持つ）';
COMMENT ON TABLE public.info_bank_chunks IS '社内AI情報バンクの検索用チャンク（revision が documents.revision と一致するものが検索対象）';

-- -----------------------------------------------------------------------------
-- RLS（閲覧のみ。書き込みは service_role 経由）
-- -----------------------------------------------------------------------------
ALTER TABLE public.info_bank_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_bank_chunks ENABLE ROW LEVEL SECURITY;

-- 従業員は公開済みの資料だけ、管理者は取り込み中・失敗を含めて閲覧できる
CREATE POLICY "info_bank_documents_select"
  ON public.info_bank_documents FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      published_at IS NOT NULL
      OR COALESCE(public.current_employee_app_role(), 'employee') <> 'employee'
    )
  );

-- 検索 RPC は SECURITY INVOKER のため、従業員も公開版のチャンクだけは読める必要がある
CREATE POLICY "info_bank_chunks_select"
  ON public.info_bank_chunks FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      COALESCE(public.current_employee_app_role(), 'employee') <> 'employee'
      OR EXISTS (
        SELECT 1
        FROM public.info_bank_documents d
        WHERE d.id = info_bank_chunks.document_id
          AND d.published_at IS NOT NULL
          AND d.revision = info_bank_chunks.revision
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 検索 RPC（SECURITY INVOKER: 呼び出しユーザーの RLS と current_tenant_id() が効く）
-- -----------------------------------------------------------------------------

-- テキスト検索。content に語が含まれるチャンクを、ヒットした語数で並べる。
-- 資料のタイトル・キーワード・タグに語が含まれる場合は加点し、本文に語が無くても
-- 資料の先頭 3 チャンクを返す（別名・旧称をキーワードに登録した資料を拾うため）。
-- 注意: ILIKE をサブクエリで数える都合でテナント内のチャンクを走査する。
--       自動モードでは有効チャンクが少ない間（しきい値未満）しか使われない前提。
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
    SELECT '%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pat
    FROM unnest(p_terms) AS t
    WHERE length(trim(t)) > 0
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
  LIMIT p_limit;
$$;

-- ベクトル検索（コサイン類似度）
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
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 検索対象（公開中の版）のチャンク数。自動モードの切替判定に使う
CREATE OR REPLACE FUNCTION public.count_info_bank_chunks()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT count(*)::integer
  FROM public.info_bank_chunks c
  JOIN public.info_bank_documents d
    ON d.id = c.document_id AND d.revision = c.revision
  WHERE c.tenant_id = public.current_tenant_id()
    AND d.tenant_id = c.tenant_id
    AND d.published_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.search_info_bank_text(text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_info_bank_chunks(vector(1536), integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_info_bank_chunks() TO authenticated;

-- -----------------------------------------------------------------------------
-- 版の公開（service_role 専用）
--   取り込み中の版(pending_revision = p_revision)を公開版に切り替え、旧版のチャンクを削除する。
--   戻り値は不要になった旧ファイルの storage_path（無ければ NULL）。呼び出し側が Storage から消す。
--   切替の前提: その版のチャンクが 1 件以上あり、全件が埋め込み済みであること。
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
  -- 同時に複数の改訂が走っても切替が直列化されるよう、資料の行をロックする
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

REVOKE ALL ON FUNCTION public.publish_info_bank_revision(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_info_bank_revision(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_info_bank_revision(uuid, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- Storage バケット（非公開・50MB・許可 MIME は tenant_rag と同じ）
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'info_bank',
  'info_bank',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

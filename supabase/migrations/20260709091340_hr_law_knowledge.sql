-- =============================================================================
-- AI人事アシスタント: 法令ナレッジ自動更新（Phase 2）
-- 全テナント共有（tenant_id を持たない）。厚労省等の公的ドメインから収集した
-- 公開情報のみを対象とするため、テナント分離は不要。
-- =============================================================================

-- 監視トピックマスタ（SaaS管理者がメンテ）
CREATE TABLE public.hr_law_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         text NOT NULL,
  search_query  text NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,
  last_run_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 収集した法令情報
CREATE TABLE public.hr_law_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     uuid REFERENCES public.hr_law_sources(id) ON DELETE SET NULL,
  title         text NOT NULL,
  source_url    text NOT NULL,
  content_hash  text NOT NULL,
  summary       text NOT NULL,
  published_at  date,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'published'
                CHECK (status IN ('published', 'disabled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_hash)
);

CREATE INDEX hr_law_documents_source_idx ON public.hr_law_documents(source_id);
CREATE INDEX hr_law_documents_status_idx ON public.hr_law_documents(status);

-- 埋め込みチャンク（tenant_rag_chunks / tenant_hr_assistant_templates と同じ 1536 次元）
CREATE TABLE public.hr_law_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES public.hr_law_documents(id) ON DELETE CASCADE,
  chunk_index  int NOT NULL,
  content      text NOT NULL,
  embedding    vector(1536),
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hr_law_chunks_document_idx ON public.hr_law_chunks(document_id);

-- RLS 有効化
ALTER TABLE public.hr_law_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_law_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_law_chunks ENABLE ROW LEVEL SECURITY;

-- SELECT: 公開情報のため authenticated 全員に許可。
-- 書き込みは service_role のみ（週次ジョブ・SaaS管理画面の Server Action は
-- createAdminClient() を使用。RLS ポリシーを敢えて定義しないことで
-- authenticated からの書き込みを一律拒否する）。
CREATE POLICY "hr_law_sources_select" ON public.hr_law_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hr_law_documents_select" ON public.hr_law_documents
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "hr_law_chunks_select" ON public.hr_law_chunks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.hr_law_documents d
      WHERE d.id = hr_law_chunks.document_id AND d.status = 'published'
    )
  );

-- 法令チャンクをコサイン距離で検索する RPC（match_tenant_rag_chunks と同じ設計）
CREATE OR REPLACE FUNCTION public.match_hr_law_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::double precision AS similarity
  FROM public.hr_law_chunks c
  JOIN public.hr_law_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.status = 'published'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_hr_law_chunks IS '全テナント共有の法令ナレッジチャンクをコサイン距離で検索';

GRANT EXECUTE ON FUNCTION public.match_hr_law_chunks(vector(1536), integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 監視トピック seed 8件
-- ---------------------------------------------------------------------------
INSERT INTO public.hr_law_sources (topic, search_query) VALUES
  ('最低賃金', '最低賃金 改定 site:mhlw.go.jp'),
  ('社会保険料率', '社会保険料率 改定 site:mhlw.go.jp OR site:nenkin.go.jp'),
  ('労働基準法改正', '労働基準法 改正 site:mhlw.go.jp OR site:e-gov.go.jp'),
  ('育児介護休業法', '育児介護休業法 改正 site:mhlw.go.jp'),
  ('労働安全衛生（ストレスチェック関連）', 'ストレスチェック 労働安全衛生法 site:mhlw.go.jp'),
  ('36協定・時間外労働', '36協定 時間外労働 上限規制 site:mhlw.go.jp'),
  ('ハラスメント防止', 'ハラスメント防止 改正 site:mhlw.go.jp'),
  ('障害者雇用', '障害者雇用促進法 改正 site:mhlw.go.jp OR site:jsite.mhlw.go.jp');

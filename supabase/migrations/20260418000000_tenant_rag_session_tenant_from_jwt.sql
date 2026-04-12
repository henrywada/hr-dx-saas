-- employees 行がなくても JWT の tenant_id で RAG を利用できるようにする（SaaS 管理者など）

CREATE OR REPLACE FUNCTION public.rag_session_tenant_id() RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    public.current_tenant_id(),
    NULLIF(
      trim(
        COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'tenant_id',
          auth.jwt() -> 'app_metadata' ->> 'tenant_id'
        )
      ),
      ''
    )::uuid
  );
$$;

COMMENT ON FUNCTION public.rag_session_tenant_id() IS 'RAG 用: current_tenant_id() または JWT の tenant_id';

-- ベクトル検索 RPC
CREATE OR REPLACE FUNCTION public.match_tenant_rag_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index integer,
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
    c.chunk_index,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::double precision AS similarity
  FROM public.tenant_rag_chunks c
  WHERE c.tenant_id = public.rag_session_tenant_id()
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- テーブル RLS（_hr および旧 current_tenant_id の _tenant を rag_session_tenant_id に統一）
DROP POLICY IF EXISTS "tenant_rag_documents_select_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_insert_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_update_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_delete_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_select_tenant" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_insert_tenant" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_update_tenant" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_delete_tenant" ON public.tenant_rag_documents;

CREATE POLICY "tenant_rag_documents_select_tenant"
  ON public.tenant_rag_documents FOR SELECT TO authenticated
  USING (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_documents_insert_tenant"
  ON public.tenant_rag_documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_documents_update_tenant"
  ON public.tenant_rag_documents FOR UPDATE TO authenticated
  USING (tenant_id = public.rag_session_tenant_id())
  WITH CHECK (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_documents_delete_tenant"
  ON public.tenant_rag_documents FOR DELETE TO authenticated
  USING (tenant_id = public.rag_session_tenant_id());

DROP POLICY IF EXISTS "tenant_rag_chunks_select_tenant" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_insert_hr" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_update_hr" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_delete_hr" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_insert_tenant" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_update_tenant" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_delete_tenant" ON public.tenant_rag_chunks;

CREATE POLICY "tenant_rag_chunks_select_tenant"
  ON public.tenant_rag_chunks FOR SELECT TO authenticated
  USING (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_chunks_insert_tenant"
  ON public.tenant_rag_chunks FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_chunks_update_tenant"
  ON public.tenant_rag_chunks FOR UPDATE TO authenticated
  USING (tenant_id = public.rag_session_tenant_id())
  WITH CHECK (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_chunks_delete_tenant"
  ON public.tenant_rag_chunks FOR DELETE TO authenticated
  USING (tenant_id = public.rag_session_tenant_id());

DROP POLICY IF EXISTS "tenant_rag_audit_logs_select_hr" ON public.tenant_rag_audit_logs;
DROP POLICY IF EXISTS "tenant_rag_audit_logs_insert_hr" ON public.tenant_rag_audit_logs;
DROP POLICY IF EXISTS "tenant_rag_audit_logs_select_tenant" ON public.tenant_rag_audit_logs;
DROP POLICY IF EXISTS "tenant_rag_audit_logs_insert_tenant" ON public.tenant_rag_audit_logs;

CREATE POLICY "tenant_rag_audit_logs_select_tenant"
  ON public.tenant_rag_audit_logs FOR SELECT TO authenticated
  USING (tenant_id = public.rag_session_tenant_id());

CREATE POLICY "tenant_rag_audit_logs_insert_tenant"
  ON public.tenant_rag_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.rag_session_tenant_id());

-- Storage
DROP POLICY IF EXISTS "tenant_rag_storage_select_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_insert_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_update_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_delete_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_insert_tenant" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_update_tenant" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_delete_tenant" ON storage.objects;

CREATE POLICY "tenant_rag_storage_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.rag_session_tenant_id()::text
  );

CREATE POLICY "tenant_rag_storage_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.rag_session_tenant_id()::text
  );

CREATE POLICY "tenant_rag_storage_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.rag_session_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.rag_session_tenant_id()::text
  );

CREATE POLICY "tenant_rag_storage_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.rag_session_tenant_id()::text
  );

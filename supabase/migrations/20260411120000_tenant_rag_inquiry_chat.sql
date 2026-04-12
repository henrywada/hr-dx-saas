-- =============================================================================
-- テナント別 RAG（人事ナレッジ）とお問合せチャット
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.tenant_rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_kind text NOT NULL,
  mime_type text,
  original_filename text,
  source_url text,
  storage_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  error_message text,
  byte_size bigint,
  created_by uuid,
  ingest_started_at timestamptz,
  ingest_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_rag_documents_tenant_id_idx ON public.tenant_rag_documents(tenant_id);

CREATE TABLE public.tenant_rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.tenant_rag_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX tenant_rag_chunks_tenant_id_idx ON public.tenant_rag_chunks(tenant_id);
CREATE INDEX tenant_rag_chunks_document_id_idx ON public.tenant_rag_chunks(document_id);

CREATE INDEX tenant_rag_chunks_embedding_ivfflat_idx ON public.tenant_rag_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE public.tenant_rag_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  document_id uuid,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_rag_audit_logs_tenant_id_idx ON public.tenant_rag_audit_logs(tenant_id);

CREATE TABLE public.tenant_inquiry_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_inquiry_chat_sessions_tenant_user_idx
  ON public.tenant_inquiry_chat_sessions(tenant_id, user_id);

CREATE TABLE public.tenant_inquiry_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.tenant_inquiry_chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  cited_chunk_ids uuid[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_inquiry_chat_messages_session_idx ON public.tenant_inquiry_chat_messages(session_id);

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
  WHERE c.tenant_id = public.current_tenant_id()
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_tenant_rag_chunks IS '同一テナントのナレッジチャンクをコサイン距離で検索';

GRANT EXECUTE ON FUNCTION public.match_tenant_rag_chunks(vector(1536), integer) TO authenticated;

ALTER TABLE public.tenant_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_rag_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_inquiry_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_inquiry_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_rag_documents_select_hr"
  ON public.tenant_rag_documents FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_documents_insert_hr"
  ON public.tenant_rag_documents FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_documents_update_hr"
  ON public.tenant_rag_documents FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_documents_delete_hr"
  ON public.tenant_rag_documents FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_chunks_select_tenant"
  ON public.tenant_rag_chunks FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_chunks_insert_hr"
  ON public.tenant_rag_chunks FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_chunks_update_hr"
  ON public.tenant_rag_chunks FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_chunks_delete_hr"
  ON public.tenant_rag_chunks FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_audit_logs_select_hr"
  ON public.tenant_rag_audit_logs FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_audit_logs_insert_hr"
  ON public.tenant_rag_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_inquiry_sessions_select_own_or_hr"
  ON public.tenant_inquiry_chat_sessions FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
    )
  );

CREATE POLICY "tenant_inquiry_sessions_insert_own"
  ON public.tenant_inquiry_chat_sessions FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "tenant_inquiry_sessions_update_own"
  ON public.tenant_inquiry_chat_sessions FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "tenant_inquiry_messages_select_session"
  ON public.tenant_inquiry_chat_messages FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
    )
  );

CREATE POLICY "tenant_inquiry_messages_insert_own"
  ON public.tenant_inquiry_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant_rag',
  'tenant_rag',
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

CREATE POLICY "tenant_rag_storage_select_hr"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_storage_insert_hr"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_storage_update_hr"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

CREATE POLICY "tenant_rag_storage_delete_hr"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text])
  );

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status
)
VALUES (
  'c4d5e6f7-a8b9-4001-8002-000000000001',
  'ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4',
  '人事ナレッジチャット',
  NULL,
  '制度・手続きのお問合せ（AI）',
  '登録された社内規程・制度に基づき、AI が回答します。最終判断は人事へご確認ください。',
  250,
  '/inquiry-chat',
  NULL,
  NULL,
  'all_users',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status
)
VALUES (
  'c4d5e6f7-a8b9-4001-8002-000000000002',
  '35c69c7f-6580-4250-a125-d15c28ead6b2',
  '人事ナレッジ登録',
  NULL,
  '人事ナレッジ（RAG）の登録',
  'PDF・Office・URL 等から制度文書を取り込み、チャットの参照元にします。',
  282,
  '/adm/inquiry-chat-knowledge',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), r.app_role_id, 'c4d5e6f7-a8b9-4001-8002-000000000002'::uuid
FROM (VALUES
  ('03c94882-88b0-4937-887b-c3733ab21028'::uuid),
  ('74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid)
) AS r(app_role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_role_service ars
  WHERE ars.app_role_id = r.app_role_id
    AND ars.service_id = 'c4d5e6f7-a8b9-4001-8002-000000000002'::uuid
);

INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, 'c4d5e6f7-a8b9-4001-8002-000000000001'::uuid
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id AND ts.service_id = 'c4d5e6f7-a8b9-4001-8002-000000000001'::uuid
);

INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, 'c4d5e6f7-a8b9-4001-8002-000000000002'::uuid
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id AND ts.service_id = 'c4d5e6f7-a8b9-4001-8002-000000000002'::uuid
);

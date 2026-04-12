-- 人事ナレッジ（RAG）の登録・削除を、同一テナント内の認証ユーザーに許可する（人事ロール専用を解除）

DROP POLICY IF EXISTS "tenant_rag_documents_select_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_insert_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_update_hr" ON public.tenant_rag_documents;
DROP POLICY IF EXISTS "tenant_rag_documents_delete_hr" ON public.tenant_rag_documents;

CREATE POLICY "tenant_rag_documents_select_tenant"
  ON public.tenant_rag_documents FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_documents_insert_tenant"
  ON public.tenant_rag_documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_documents_update_tenant"
  ON public.tenant_rag_documents FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_documents_delete_tenant"
  ON public.tenant_rag_documents FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_rag_chunks_insert_hr" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_update_hr" ON public.tenant_rag_chunks;
DROP POLICY IF EXISTS "tenant_rag_chunks_delete_hr" ON public.tenant_rag_chunks;

CREATE POLICY "tenant_rag_chunks_insert_tenant"
  ON public.tenant_rag_chunks FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_chunks_update_tenant"
  ON public.tenant_rag_chunks FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_chunks_delete_tenant"
  ON public.tenant_rag_chunks FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_rag_audit_logs_select_hr" ON public.tenant_rag_audit_logs;
DROP POLICY IF EXISTS "tenant_rag_audit_logs_insert_hr" ON public.tenant_rag_audit_logs;

CREATE POLICY "tenant_rag_audit_logs_select_tenant"
  ON public.tenant_rag_audit_logs FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_rag_audit_logs_insert_tenant"
  ON public.tenant_rag_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_rag_storage_select_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_insert_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_update_hr" ON storage.objects;
DROP POLICY IF EXISTS "tenant_rag_storage_delete_hr" ON storage.objects;

CREATE POLICY "tenant_rag_storage_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

CREATE POLICY "tenant_rag_storage_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

CREATE POLICY "tenant_rag_storage_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

CREATE POLICY "tenant_rag_storage_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant_rag'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- =============================================================================
-- テナント管理者向け AI 人事相談アシスタント（NEW-1）
-- inquiry-chat の RAG 基盤（tenant_rag_documents / tenant_rag_chunks）を共用。
-- 管理者専用セッション/メッセージを分離して管理する。
-- =============================================================================

CREATE TABLE public.tenant_hr_assistant_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  title       text,
  mode        text NOT NULL DEFAULT 'general'
              CHECK (mode IN ('general', 'labor_calc', 'comment_review', 'case_search')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_hr_assistant_sessions_tenant_user_idx
  ON public.tenant_hr_assistant_sessions(tenant_id, user_id);

CREATE TABLE public.tenant_hr_assistant_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id       uuid NOT NULL
                   REFERENCES public.tenant_hr_assistant_sessions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL,
  role             text NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text NOT NULL,
  mode             text NOT NULL DEFAULT 'general',
  cited_chunk_ids  uuid[] DEFAULT NULL,
  metadata         jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_hr_assistant_messages_session_idx
  ON public.tenant_hr_assistant_messages(session_id);

-- RLS 有効化
ALTER TABLE public.tenant_hr_assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_hr_assistant_messages ENABLE ROW LEVEL SECURITY;

-- セッション RLS：同一テナントの管理者のみ参照・作成、自分のセッションのみ変更・削除
CREATE POLICY "hr_assistant_sessions_select" ON public.tenant_hr_assistant_sessions
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hr_assistant_sessions_insert" ON public.tenant_hr_assistant_sessions
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "hr_assistant_sessions_update" ON public.tenant_hr_assistant_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "hr_assistant_sessions_delete" ON public.tenant_hr_assistant_sessions
  FOR DELETE USING (user_id = auth.uid());

-- メッセージ RLS
CREATE POLICY "hr_assistant_messages_select" ON public.tenant_hr_assistant_messages
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hr_assistant_messages_insert" ON public.tenant_hr_assistant_messages
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

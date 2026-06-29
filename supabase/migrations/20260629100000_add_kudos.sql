-- 感謝・称賛（Kudos）
-- 設計: docs/implementation-plan-recognition-kudos.md（Must要件のみ）

CREATE TABLE public.kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sender_employee_id UUID NOT NULL REFERENCES public.employees(id),
  message TEXT NOT NULL,
  value_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kudos_tenant_created ON public.kudos (tenant_id, created_at DESC);

CREATE TABLE public.kudos_recipients (
  kudos_id UUID NOT NULL REFERENCES public.kudos(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  PRIMARY KEY (kudos_id, employee_id)
);

CREATE INDEX idx_kudos_recipients_employee ON public.kudos_recipients (employee_id);

CREATE TABLE public.kudos_reactions (
  kudos_id UUID NOT NULL REFERENCES public.kudos(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  PRIMARY KEY (kudos_id, employee_id)
);

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos_reactions ENABLE ROW LEVEL SECURITY;

-- kudos: テナント全員が全社フィードをSELECT可能。投稿は本人（sender_employee_id=自分）のみ
CREATE POLICY "kudos_select_tenant" ON public.kudos
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "kudos_insert_self" ON public.kudos
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND sender_employee_id = current_employee_id()
  );

-- kudos_recipients: フィード表示のためテナント全員がSELECT可能。INSERTは紐づくkudosの投稿者本人のみ
CREATE POLICY "kudos_recipients_select_tenant" ON public.kudos_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kudos k
      WHERE k.id = kudos_recipients.kudos_id AND k.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "kudos_recipients_insert_sender" ON public.kudos_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kudos k
      WHERE k.id = kudos_recipients.kudos_id
        AND k.tenant_id = current_tenant_id()
        AND k.sender_employee_id = current_employee_id()
    )
  );

-- kudos_reactions: リアクション件数表示のためテナント全員がSELECT可能。本人のリアクションのみ追加・削除可能（トグル）
CREATE POLICY "kudos_reactions_select_tenant" ON public.kudos_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kudos k
      WHERE k.id = kudos_reactions.kudos_id AND k.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "kudos_reactions_insert_self" ON public.kudos_reactions
  FOR INSERT WITH CHECK (
    employee_id = current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.kudos k
      WHERE k.id = kudos_reactions.kudos_id AND k.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "kudos_reactions_delete_self" ON public.kudos_reactions
  FOR DELETE USING (employee_id = current_employee_id());

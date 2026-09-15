-- 20260916010000_create_captured_documents.sql
-- 文書ホルダー（名刺・請求書・発注書・領収書）: 撮影・AI読み取り・一覧・CSVエクスポート。
-- 移植元: dx-sensor captured_documents / captured_document_images / captured_document_line_items。
-- hr-dx-saas 向けに tenant_id 分離、division_id による部門マネージャー閲覧、
-- company_visible による名刺公開を追加。編集・削除は本人のみ。
-- 参照: docs/superpowers/specs/2026-09-16-documents-migration-design.md

-- ============================================================
-- 1. captured_documents（文書本体）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.captured_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id     UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,
  document_mode   TEXT,
  company_visible BOOLEAN NOT NULL DEFAULT false,
  title           TEXT NOT NULL DEFAULT '',
  counterparty    TEXT NOT NULL DEFAULT '',
  context_date    DATE,
  amount_yen      NUMERIC(12, 2),
  notes           TEXT NOT NULL DEFAULT '',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  extracted       JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_ocr         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.captured_documents IS
  '汎用文書キャプチャ。種類は document_type（プラグインが正）。division_id は投稿当時の所属部門を固定保存する。';

COMMENT ON COLUMN public.captured_documents.document_mode IS
  '区分（モード）。例: receipt の expense / qualified_invoice。モードを持たない document_type は null。';

ALTER TABLE public.captured_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY captured_documents_select ON public.captured_documents
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      owner_user_id = auth.uid()
      OR (document_type = 'business_card' AND company_visible = true)
      OR (
        division_id = public.current_employee_division_id()
        AND public.current_employee_is_manager()
      )
    )
  );

CREATE POLICY captured_documents_insert ON public.captured_documents
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND owner_user_id = auth.uid()
  );

CREATE POLICY captured_documents_update ON public.captured_documents
  FOR UPDATE
  USING (tenant_id = public.current_tenant_id() AND owner_user_id = auth.uid())
  WITH CHECK (tenant_id = public.current_tenant_id() AND owner_user_id = auth.uid());

CREATE POLICY captured_documents_delete ON public.captured_documents
  FOR DELETE USING (
    tenant_id = public.current_tenant_id() AND owner_user_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS captured_documents_tenant_type_created_idx
  ON public.captured_documents (tenant_id, document_type, created_at DESC);

CREATE INDEX IF NOT EXISTS captured_documents_tenant_type_mode_idx
  ON public.captured_documents (tenant_id, document_type, document_mode, created_at DESC);

CREATE INDEX IF NOT EXISTS captured_documents_tenant_owner_idx
  ON public.captured_documents (tenant_id, owner_user_id);

CREATE INDEX IF NOT EXISTS captured_documents_tenant_visible_idx
  ON public.captured_documents (tenant_id, company_visible);

CREATE INDEX IF NOT EXISTS captured_documents_tenant_context_date_idx
  ON public.captured_documents (tenant_id, context_date DESC);

CREATE INDEX IF NOT EXISTS captured_documents_division_created_idx
  ON public.captured_documents (division_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.captured_documents TO authenticated;

-- ============================================================
-- 2. captured_document_images（画像）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.captured_document_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES public.captured_documents(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('front', 'back', 'page')),
  storage_path TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.captured_document_images IS
  '文書キャプチャの画像。role は front/back/page。storage_path は captured-documents バケット内のパス。';

ALTER TABLE public.captured_document_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY captured_document_images_select ON public.captured_document_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = public.current_tenant_id()
        AND (
          d.owner_user_id = auth.uid()
          OR (d.document_type = 'business_card' AND d.company_visible = true)
          OR (
            d.division_id = public.current_employee_division_id()
            AND public.current_employee_is_manager()
          )
        )
    )
  );

CREATE POLICY captured_document_images_insert ON public.captured_document_images
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = captured_document_images.tenant_id
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE POLICY captured_document_images_update ON public.captured_document_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = public.current_tenant_id()
        AND d.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = captured_document_images.tenant_id
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE POLICY captured_document_images_delete ON public.captured_document_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = public.current_tenant_id()
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS captured_document_images_document_idx
  ON public.captured_document_images (document_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.captured_document_images TO authenticated;

-- ============================================================
-- 3. captured_document_line_items（明細行）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.captured_document_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES public.captured_documents(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  line_no          INT NOT NULL CHECK (line_no > 0),
  transaction_date DATE,
  description      TEXT NOT NULL DEFAULT '',
  quantity         TEXT NOT NULL DEFAULT '',
  unit             TEXT NOT NULL DEFAULT '',
  unit_price       NUMERIC(12, 2),
  amount           NUMERIC(12, 2),
  tax_rate         TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, line_no)
);

COMMENT ON TABLE public.captured_document_line_items IS
  '伝票明細行。主に invoice / purchase_order で使用。';

ALTER TABLE public.captured_document_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY captured_document_line_items_select ON public.captured_document_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = public.current_tenant_id()
        AND (
          d.owner_user_id = auth.uid()
          OR (d.document_type = 'business_card' AND d.company_visible = true)
          OR (
            d.division_id = public.current_employee_division_id()
            AND public.current_employee_is_manager()
          )
        )
    )
  );

CREATE POLICY captured_document_line_items_insert ON public.captured_document_line_items
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = captured_document_line_items.tenant_id
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE POLICY captured_document_line_items_update ON public.captured_document_line_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = public.current_tenant_id()
        AND d.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = captured_document_line_items.tenant_id
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE POLICY captured_document_line_items_delete ON public.captured_document_line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = document_id
        AND d.tenant_id = public.current_tenant_id()
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS captured_document_line_items_document_idx
  ON public.captured_document_line_items (document_id, line_no);

CREATE INDEX IF NOT EXISTS captured_document_line_items_tenant_document_idx
  ON public.captured_document_line_items (tenant_id, document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.captured_document_line_items TO authenticated;

-- ============================================================
-- 4. Storage バケット + RLS
-- ============================================================
-- パス規約:
--   tmp:   {tenantId}/tmp/{userId}/{fileId}.jpg
--   final: {tenantId}/{documentType}/{yyyy-mm-dd}/{documentId}/{fileId}.jpg

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'captured-documents',
  'captured-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY captured_documents_storage_tmp ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'captured-documents'
    AND (storage.foldername(name))[2] = 'tmp'
    AND (storage.foldername(name))[1]::uuid = public.current_tenant_id()
    AND (storage.foldername(name))[3]::uuid = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'captured-documents'
    AND (storage.foldername(name))[2] = 'tmp'
    AND (storage.foldername(name))[1]::uuid = public.current_tenant_id()
    AND (storage.foldername(name))[3]::uuid = auth.uid()
  );

CREATE POLICY captured_documents_storage_final_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'captured-documents'
    AND (storage.foldername(name))[2] IS DISTINCT FROM 'tmp'
    AND (storage.foldername(name))[1]::uuid = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.captured_documents d
      WHERE d.id = (storage.foldername(name))[4]::uuid
        AND d.tenant_id = public.current_tenant_id()
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE POLICY captured_documents_storage_final_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'captured-documents'
    AND (storage.foldername(name))[2] IS DISTINCT FROM 'tmp'
    AND EXISTS (
      SELECT 1
      FROM public.captured_document_images i
      JOIN public.captured_documents d ON d.id = i.document_id
      WHERE i.storage_path = name
        AND d.tenant_id = public.current_tenant_id()
        AND (
          d.owner_user_id = auth.uid()
          OR (d.document_type = 'business_card' AND d.company_visible = true)
          OR (
            d.division_id = public.current_employee_division_id()
            AND public.current_employee_is_manager()
          )
        )
    )
  );

CREATE POLICY captured_documents_storage_final_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'captured-documents'
    AND (storage.foldername(name))[2] IS DISTINCT FROM 'tmp'
    AND EXISTS (
      SELECT 1
      FROM public.captured_document_images i
      JOIN public.captured_documents d ON d.id = i.document_id
      WHERE i.storage_path = name
        AND d.tenant_id = public.current_tenant_id()
        AND d.owner_user_id = auth.uid()
    )
  );

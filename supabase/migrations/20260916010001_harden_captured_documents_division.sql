-- 20260916010001_harden_captured_documents_division.sql
-- division_id を INSERT 時に投稿者の所属に固定し、UPDATE で identity カラムの書き換えを防ぐ。
-- 20260916010000 が既適用の環境向けの additive マイグレーション（db reset 不要）。

DROP POLICY IF EXISTS captured_documents_insert ON public.captured_documents;

CREATE POLICY captured_documents_insert ON public.captured_documents
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND owner_user_id = auth.uid()
    AND division_id = public.current_employee_division_id()
  );

-- captured_documents の UPDATE は可変フィールドのみ許可（tenant_id/division_id等の書き換えを
-- RLSのWITH CHECKだけで防ぐのはOLD値参照ができず困難なため、カラム権限で防ぐ）
REVOKE UPDATE ON public.captured_documents FROM authenticated;
GRANT UPDATE (
  title,
  counterparty,
  context_date,
  amount_yen,
  notes,
  tags,
  extracted,
  raw_ocr,
  company_visible,
  document_mode,
  updated_at
) ON public.captured_documents TO authenticated;

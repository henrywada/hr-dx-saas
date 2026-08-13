-- 手入力フォームに出す検査項目（テナントが選択）。標準名は kyokai 結果本表/追加検査のヘッダ

CREATE TABLE public.health_check_manual_form_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.health_check_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_manual_form_items_tenant_item UNIQUE (tenant_id, item_id)
);

COMMENT ON TABLE public.health_check_manual_form_items IS
  '人事の手入力フォームに表示する検査項目。未設定時はアプリ側で法定数値の既定12項目を使う';

CREATE INDEX idx_health_check_manual_form_items_tenant
  ON public.health_check_manual_form_items (tenant_id, sort_order);

ALTER TABLE public.health_check_manual_form_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_manual_form_items_hr"
  ON public.health_check_manual_form_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_manual_form_items_updated_at
  BEFORE UPDATE ON public.health_check_manual_form_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

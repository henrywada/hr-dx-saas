-- service_category を大分類（service_class）に区分するためのマスタテーブルを追加する。
-- service_class: 大分類マスタ
-- service_class_index: service_class と service_category の紐付け

CREATE TABLE public.service_class (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INTEGER,
  name TEXT
);

ALTER TABLE public.service_class ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_select_service_class" ON public.service_class
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "global_write_service_class" ON public.service_class
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supa_write_service_class" ON public.service_class
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

CREATE TABLE public.service_class_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_class_id UUID REFERENCES public.service_class(id) ON DELETE CASCADE,
  service_category_id UUID REFERENCES public.service_category(id) ON DELETE CASCADE
);

ALTER TABLE public.service_class_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_select_service_class_index" ON public.service_class_index
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "global_write_service_class_index" ON public.service_class_index
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supa_write_service_class_index" ON public.service_class_index
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

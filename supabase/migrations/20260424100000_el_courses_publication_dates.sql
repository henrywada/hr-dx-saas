-- eラーニング: 公開コースの受講可能期間（任意・日付のみ）
-- 両方 NULL のときは期間制御を行わない

ALTER TABLE public.el_courses
  ADD COLUMN IF NOT EXISTS published_start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS published_end_date DATE NULL;

COMMENT ON COLUMN public.el_courses.published_start_date IS '公開コースの受講開始日（JST 日付として比較）。NULL なら開始制限なし';
COMMENT ON COLUMN public.el_courses.published_end_date IS '公開コースの受講終了日（JST 日付として比較）。NULL なら終了制限なし';

NOTIFY pgrst, 'reload schema';

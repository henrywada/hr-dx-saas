-- リスト用 summary と分離した詳細説明（モーダル・AI回答用）
ALTER TABLE public.hr_law_documents
  ADD COLUMN IF NOT EXISTS detail text;

COMMENT ON COLUMN public.hr_law_documents.summary IS '一覧2行用の短い要約';
COMMENT ON COLUMN public.hr_law_documents.detail IS '情報元URLを開かなくても足りる詳細説明。AI人事アシスタントの回答根拠にも使う';

-- 既存行は当面 summary を detail にコピー（次回収集で上書きされる）
UPDATE public.hr_law_documents
SET detail = summary
WHERE detail IS NULL AND summary IS NOT NULL;

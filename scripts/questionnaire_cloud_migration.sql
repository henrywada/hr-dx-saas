/*
=============================================================================
クラウド Supabase 用：アンケートデータ移行スクリプト
=============================================================================
ローカル開発環境のアンケートテーブルデータをクラウド Supabase へ移行します。
既存データを絶対に削除しません（ON CONFLICT DO NOTHING で重複対策）
=============================================================================
実行方法：
1. クラウド Supabase の SQL Editor を開く
2. このスクリプト全体をコピー＆ペースト
3. 「Run」ボタンをクリック
=============================================================================
*/

-- 一時的に RLS を無効化（挿入用）
ALTER TABLE public.questionnaires DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_question_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_question_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answers DISABLE ROW LEVEL SECURITY;

-- 既存シーケンス無効化（UUID の自動採番重複を防ぐ）
ALTER TABLE public.questionnaires DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_sections DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_questions DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_question_items DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_question_options DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_assignments DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_responses DISABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_answers DISABLE TRIGGER ALL;

-- ============================================================================
-- データ挿入（重複時は無視）
-- ============================================================================

INSERT INTO public.questionnaires (id, creator_type, tenant_id, title, description, status, created_by_employee_id, created_at, updated_at) VALUES
('f0a1b2c3-d4e5-6789-abcd-ef0123456789', 'system', NULL, '顧客満足度調査アンケート', 'お客様各位

日頃より弊社サービスをご利用いただき、誠にありがとうございます。
本調査は、商品やサービスの品質向上および次期マーケティング戦略の立案のため、皆様の貴重なご意見を収集することを目的としております。', 'draft', NULL, '2026-04-17 14:11:19.365889+09', '2026-04-17 15:12:59.988644+09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questionnaire_sections (id, questionnaire_id, title, sort_order) VALUES
('a1000001-0000-0000-0000-000000000001', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', '【お客様属性】', 0),
('a1000001-0000-0000-0000-000000000002', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', '1. 以下の項目について5段階で評価してください。', 1),
('a1000001-0000-0000-0000-000000000003', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', '2. 当サービスをご利用いただいた理由をお選びください（複数回答可）', 2),
('a1000001-0000-0000-0000-000000000004', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', '3. 今後改善を希望される点があればご記入ください。', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questionnaire_questions (id, questionnaire_id, section_id, question_type, question_text, options_json, is_required, sort_order) VALUES
('b1000001-0000-0000-0000-000000000001', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', 'a1000001-0000-0000-0000-000000000001', 'radio', '年齢層', NULL, true, 0),
('b1000001-0000-0000-0000-000000000002', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', 'a1000001-0000-0000-0000-000000000001', 'radio', '利用頻度', NULL, true, 1),
('b1000001-0000-0000-0000-000000000003', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', 'a1000001-0000-0000-0000-000000000002', 'rating_table', '以下の項目について5段階で評価してください。', '["非常に不満", "やや不満", "どちらとも言えない", "やや満足", "非常に満足"]', true, 2),
('b1000001-0000-0000-0000-000000000004', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', 'a1000001-0000-0000-0000-000000000003', 'checkbox', '当サービスをご利用いただいた理由をお選びください（複数回答可）', NULL, false, 3),
('b1000001-0000-0000-0000-000000000005', 'f0a1b2c3-d4e5-6789-abcd-ef0123456789', 'a1000001-0000-0000-0000-000000000004', 'text', '今後改善を希望される点があればご記入ください。', NULL, false, 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questionnaire_question_items (id, question_id, item_text, sort_order) VALUES
('1c7e8c16-0a5b-4f00-8d58-0f916966519f', 'b1000001-0000-0000-0000-000000000003', '商品・サービスの品質', 0),
('11c9f06f-9b2d-4da6-8015-c304cc922238', 'b1000001-0000-0000-0000-000000000003', '価格の適切さ', 1),
('1c0f8438-c88b-48db-a570-1941a624aa4c', 'b1000001-0000-0000-0000-000000000003', 'カスタマーサポート', 2),
('f823cf71-99ab-41d6-abf2-ca5b687f33f4', 'b1000001-0000-0000-0000-000000000003', '使いやすさ', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questionnaire_question_options (id, question_id, option_text, sort_order) VALUES
('51005a21-6126-48c5-bbd3-b2a7c7fe0a8a', 'b1000001-0000-0000-0000-000000000001', '10-20代', 0),
('322f1c5a-6798-4d36-8aed-136ad01b6186', 'b1000001-0000-0000-0000-000000000001', '30-40代', 1),
('ba4d22c4-03de-4ef1-b707-b80e98ee9f12', 'b1000001-0000-0000-0000-000000000001', '50-60代', 2),
('124c2261-1fc9-4ddc-a559-e63d7bce97da', 'b1000001-0000-0000-0000-000000000001', '70以上', 3),
('b0ce81ed-24a3-4cc4-bd9e-2c10fcf7303b', 'b1000001-0000-0000-0000-000000000002', '週1回以上', 0),
('0d13894c-559e-43f6-b992-d41976161b7e', 'b1000001-0000-0000-0000-000000000002', '月1〜3回', 1),
('0f4e679c-21f2-4718-9d7f-8dfacae45ee4', 'b1000001-0000-0000-0000-000000000002', '3ヶ月に1回', 2),
('56eacf4f-f3dd-41b5-85a2-378c659746ae', 'b1000001-0000-0000-0000-000000000002', '半年に1回以下', 3),
('784e390d-2f98-477d-be08-f95d3e9cb281', 'b1000001-0000-0000-0000-000000000004', '品質が良い', 0),
('272a1a8c-3392-4b67-b92e-4d1ba8fcf1ec', 'b1000001-0000-0000-0000-000000000004', '機能が充実', 1),
('3f5e55e5-df69-47f4-9dca-bc0d79e48c40', 'b1000001-0000-0000-0000-000000000004', '価格が適切', 2),
('28baa4d1-6e44-4443-83b6-773b6af089c2', 'b1000001-0000-0000-0000-000000000004', 'アフターサポートが良い', 3),
('dbca5c01-d134-477f-a347-47c13dd7d992', 'b1000001-0000-0000-0000-000000000004', '知人の紹介', 4),
('0b75997d-baf3-4524-8b60-1fad4171d5b7', 'b1000001-0000-0000-0000-000000000004', '利便性が高い', 5),
('7f1b927a-4abb-4f07-bdd9-bfbb15f9ccfb', 'b1000001-0000-0000-0000-000000000004', '広告を見て', 6),
('505e96c9-96e9-426a-bbf7-1fbae202d700', 'b1000001-0000-0000-0000-000000000004', 'その他', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- トリガーと RLS を復元
-- ============================================================================

ALTER TABLE public.questionnaires ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_sections ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_questions ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_question_items ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_question_options ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_assignments ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_responses ENABLE TRIGGER ALL;
ALTER TABLE public.questionnaire_answers ENABLE TRIGGER ALL;

ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_question_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 検証クエリ（実行後に行数を確認）
-- ============================================================================

-- SELECT 'questionnaires' AS table_name, COUNT(*) AS row_count FROM public.questionnaires
-- UNION ALL
-- SELECT 'questionnaire_sections', COUNT(*) FROM public.questionnaire_sections
-- UNION ALL
-- SELECT 'questionnaire_questions', COUNT(*) FROM public.questionnaire_questions
-- UNION ALL
-- SELECT 'questionnaire_question_items', COUNT(*) FROM public.questionnaire_question_items
-- UNION ALL
-- SELECT 'questionnaire_question_options', COUNT(*) FROM public.questionnaire_question_options;

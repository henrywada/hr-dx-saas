-- ============================================================
-- ストレスチェック 換算表マスタ投入 + テストデータリセット
-- ============================================================
-- Supabase SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

-- ============================================================
-- PART 1: テーブルを削除して正しいスキーマで再作成
-- ============================================================
DROP TABLE IF EXISTS public.stress_check_scale_conversions CASCADE;

CREATE TABLE public.stress_check_scale_conversions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  formula text NOT NULL,
  level_1_min int NOT NULL, level_1_max int NOT NULL,
  level_2_min int NOT NULL, level_2_max int NOT NULL,
  level_3_min int NOT NULL, level_3_max int NOT NULL,
  level_4_min int NOT NULL, level_4_max int NOT NULL,
  level_5_min int NOT NULL, level_5_max int NOT NULL,
  UNIQUE (scale_name, gender)
);

ALTER TABLE public.stress_check_scale_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scale_conversions_select_all"
  ON public.stress_check_scale_conversions FOR SELECT USING (true);

GRANT ALL ON TABLE public.stress_check_scale_conversions TO anon, authenticated, service_role;

-- ============================================================
-- PART 2: 全19尺度×男女 = 38行 INSERT
-- 厚生労働省マニュアル P39-40 「素点換算表」準拠
-- ============================================================

INSERT INTO public.stress_check_scale_conversions (
  scale_name, gender, formula,
  level_1_min, level_1_max,
  level_2_min, level_2_max,
  level_3_min, level_3_max,
  level_4_min, level_4_max,
  level_5_min, level_5_max
) VALUES

-- 【A領域】ストレスの原因と考えられる因子（9尺度）

('心理的な仕事の負担（量）', 'male',   '15-(A1+A2+A3)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),
('心理的な仕事の負担（量）', 'female', '15-(A1+A2+A3)',
  3, 4,   5, 6,   7, 9,  10, 11,  12, 12),

('心理的な仕事の負担（質）', 'male',   '15-(A4+A5+A6)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),
('心理的な仕事の負担（質）', 'female', '15-(A4+A5+A6)',
  3, 4,   5, 6,   7, 8,   9, 10,  11, 12),

('自覚的な身体的負担度', 'male',   '5-A7',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('自覚的な身体的負担度', 'female', '5-A7',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

('仕事のコントロール度', 'male',   '15-(A8+A9+A10)',
  3, 4,   5, 6,   7, 8,   9, 10,  11, 12),
('仕事のコントロール度', 'female', '15-(A8+A9+A10)',
  3, 3,   4, 5,   6, 8,   9, 10,  11, 12),

('技能の活用度', 'male',   'A11',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('技能の活用度', 'female', 'A11',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

('職場の対人関係でのストレス', 'male',   '10-(A12+A13)+A14',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),
('職場の対人関係でのストレス', 'female', '10-(A12+A13)+A14',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),

('職場環境によるストレス', 'male',   '5-A15',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('職場環境によるストレス', 'female', '5-A15',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

('仕事の適性度', 'male',   '5-A16',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('仕事の適性度', 'female', '5-A16',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

('働きがい', 'male',   '5-A17',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('働きがい', 'female', '5-A17',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

-- 【B領域】ストレスによっておこる心身の反応（6尺度）

('活気', 'male',   'B1+B2+B3',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),
('活気', 'female', 'B1+B2+B3',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),

('イライラ感', 'male',   'B4+B5+B6',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),
('イライラ感', 'female', 'B4+B5+B6',
  3, 3,   4, 5,   6, 8,   9, 10,  11, 12),

('疲労感', 'male',   'B7+B8+B9',
  3, 3,   4, 4,   5, 7,   8, 10,  11, 12),
('疲労感', 'female', 'B7+B8+B9',
  3, 3,   4, 5,   6, 8,   9, 11,  12, 12),

('不安感', 'male',   'B10+B11+B12',
  3, 3,   4, 4,   5, 7,   8, 9,  10, 12),
('不安感', 'female', 'B10+B11+B12',
  3, 3,   4, 4,   5, 7,   8, 10,  11, 12),

('抑うつ感', 'male',   'B13+B14+B15+B16+B17+B18',
  6, 6,   7, 8,   9, 12,  13, 16,  17, 24),
('抑うつ感', 'female', 'B13+B14+B15+B16+B17+B18',
  6, 6,   7, 8,   9, 12,  13, 17,  18, 24),

('身体愁訴', 'male',   'B19+B20+...+B29',
  11, 11,  12, 15,  16, 21,  22, 26,  27, 44),
('身体愁訴', 'female', 'B19+B20+...+B29',
  11, 13,  14, 17,  18, 23,  24, 29,  30, 44),

-- 【C領域】ストレス反応に影響を与える他の因子（3尺度）

('上司からのサポート', 'male',   '15-(C1+C4+C7)',
  3, 4,   5, 6,   7, 8,   9, 10,  11, 12),
('上司からのサポート', 'female', '15-(C1+C4+C7)',
  3, 3,   4, 5,   6, 7,   8, 10,  11, 12),

('同僚からのサポート', 'male',   '15-(C2+C5+C8)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),
('同僚からのサポート', 'female', '15-(C2+C5+C8)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),

('家族・友人からのサポート', 'male',   '15-(C3+C6+C9)',
  3, 6,   7, 8,   9, 9,  10, 11,  12, 12),
('家族・友人からのサポート', 'female', '15-(C3+C6+C9)',
  3, 6,   7, 8,   9, 9,  10, 11,  12, 12),

-- 【D領域】仕事や生活の満足度（1尺度）

('仕事や生活の満足度', 'male',   '10-(D1+D2)',
  2, 3,   4, 4,   5, 6,   7, 7,   8, 8),
('仕事や生活の満足度', 'female', '10-(D1+D2)',
  2, 3,   4, 4,   5, 6,   7, 7,   8, 8);

-- ============================================================
-- PART 3: テストデータのリセット（再受検可能にする）
-- ============================================================
DELETE FROM public.stress_check_results;
DELETE FROM public.stress_check_submissions;
DELETE FROM public.stress_check_responses;

-- ============================================================
-- 確認クエリ
-- ============================================================
SELECT '換算表マスタ' AS item, count(*) AS cnt FROM public.stress_check_scale_conversions
UNION ALL
SELECT 'results', count(*) FROM public.stress_check_results
UNION ALL
SELECT 'submissions', count(*) FROM public.stress_check_submissions
UNION ALL
SELECT 'responses', count(*) FROM public.stress_check_responses;

-- 期待される結果:
--   換算表マスタ: 38 (19尺度 × 男女)
--   results:      0
--   submissions:  0
--   responses:    0

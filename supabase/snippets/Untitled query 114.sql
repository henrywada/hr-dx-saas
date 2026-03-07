-- ============================================================
-- ストレスチェック 換算表マスタ投入 + テストデータリセット
-- ============================================================
-- Supabase SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

-- ============================================================
-- PART 1: テーブル作成（存在しない場合のみ）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stress_check_scale_conversions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_name text NOT NULL,
  scale_group text NOT NULL CHECK (scale_group IN ('stressor', 'reaction', 'support', 'satisfaction')),
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  formula text NOT NULL,
  level_1_min int NOT NULL, level_1_max int NOT NULL,
  level_2_min int NOT NULL, level_2_max int NOT NULL,
  level_3_min int NOT NULL, level_3_max int NOT NULL,
  level_4_min int NOT NULL, level_4_max int NOT NULL,
  level_5_min int NOT NULL, level_5_max int NOT NULL,
  UNIQUE (scale_name, gender)
);

-- RLS + ポリシー（べき等に作成）
ALTER TABLE public.stress_check_scale_conversions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stress_check_scale_conversions'
      AND policyname = 'scale_conversions_select_all'
  ) THEN
    CREATE POLICY "scale_conversions_select_all"
      ON public.stress_check_scale_conversions FOR SELECT USING (true);
  END IF;
END$$;

GRANT ALL ON TABLE public.stress_check_scale_conversions TO anon, authenticated, service_role;

-- ============================================================
-- PART 2: 既存データクリア → 全19尺度×男女 INSERT
-- ============================================================
-- 厚生労働省マニュアル P39-40 「素点換算表」準拠
-- level_1 = 素点が低い側 〜 level_5 = 素点が高い側
-- ============================================================

DELETE FROM public.stress_check_scale_conversions;

INSERT INTO public.stress_check_scale_conversions (
  scale_name, scale_group, gender, formula,
  level_1_min, level_1_max,
  level_2_min, level_2_max,
  level_3_min, level_3_max,
  level_4_min, level_4_max,
  level_5_min, level_5_max
) VALUES

-- ============================================================
-- 【A領域】ストレスの原因と考えられる因子（9尺度）
-- ============================================================

-- 心理的な仕事の負担（量）: 15-(A1+A2+A3)  得点範囲 3〜12
('心理的な仕事の負担（量）', 'stressor', 'male',   '15-(A1+A2+A3)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),
('心理的な仕事の負担（量）', 'stressor', 'female', '15-(A1+A2+A3)',
  3, 4,   5, 6,   7, 9,  10, 11,  12, 12),

-- 心理的な仕事の負担（質）: 15-(A4+A5+A6)  得点範囲 3〜12
('心理的な仕事の負担（質）', 'stressor', 'male',   '15-(A4+A5+A6)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),
('心理的な仕事の負担（質）', 'stressor', 'female', '15-(A4+A5+A6)',
  3, 4,   5, 6,   7, 8,   9, 10,  11, 12),

-- 自覚的な身体的負担度: 5-A7  得点範囲 1〜4
('自覚的な身体的負担度', 'stressor', 'male',   '5-A7',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('自覚的な身体的負担度', 'stressor', 'female', '5-A7',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

-- 仕事のコントロール度: 15-(A8+A9+A10)  得点範囲 3〜12
('仕事のコントロール度', 'stressor', 'male',   '15-(A8+A9+A10)',
  3, 4,   5, 6,   7, 8,   9, 10,  11, 12),
('仕事のコントロール度', 'stressor', 'female', '15-(A8+A9+A10)',
  3, 3,   4, 5,   6, 8,   9, 10,  11, 12),

-- 技能の活用度: A11  得点範囲 1〜4
('技能の活用度', 'stressor', 'male',   'A11',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('技能の活用度', 'stressor', 'female', 'A11',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

-- 職場の対人関係でのストレス: 10-(A12+A13)+A14  得点範囲 3〜12
('職場の対人関係でのストレス', 'stressor', 'male',   '10-(A12+A13)+A14',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),
('職場の対人関係でのストレス', 'stressor', 'female', '10-(A12+A13)+A14',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),

-- 職場環境によるストレス: 5-A15  得点範囲 1〜4
('職場環境によるストレス', 'stressor', 'male',   '5-A15',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('職場環境によるストレス', 'stressor', 'female', '5-A15',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

-- 仕事の適性度: 5-A16  得点範囲 1〜4
('仕事の適性度', 'stressor', 'male',   '5-A16',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('仕事の適性度', 'stressor', 'female', '5-A16',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

-- 働きがい: 5-A17  得点範囲 1〜4
('働きがい', 'stressor', 'male',   '5-A17',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),
('働きがい', 'stressor', 'female', '5-A17',
  1, 1,   2, 2,   3, 3,   4, 4,   4, 4),

-- ============================================================
-- 【B領域】ストレスによっておこる心身の反応（6尺度）
-- ============================================================

-- 活気: B1+B2+B3  得点範囲 3〜12
('活気', 'reaction', 'male',   'B1+B2+B3',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),
('活気', 'reaction', 'female', 'B1+B2+B3',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),

-- イライラ感: B4+B5+B6  得点範囲 3〜12
('イライラ感', 'reaction', 'male',   'B4+B5+B6',
  3, 3,   4, 5,   6, 7,   8, 9,  10, 12),
('イライラ感', 'reaction', 'female', 'B4+B5+B6',
  3, 3,   4, 5,   6, 8,   9, 10,  11, 12),

-- 疲労感: B7+B8+B9  得点範囲 3〜12
('疲労感', 'reaction', 'male',   'B7+B8+B9',
  3, 3,   4, 4,   5, 7,   8, 10,  11, 12),
('疲労感', 'reaction', 'female', 'B7+B8+B9',
  3, 3,   4, 5,   6, 8,   9, 11,  12, 12),

-- 不安感: B10+B11+B12  得点範囲 3〜12
('不安感', 'reaction', 'male',   'B10+B11+B12',
  3, 3,   4, 4,   5, 7,   8, 9,  10, 12),
('不安感', 'reaction', 'female', 'B10+B11+B12',
  3, 3,   4, 4,   5, 7,   8, 10,  11, 12),

-- 抑うつ感: B13〜B18合計  得点範囲 6〜24
('抑うつ感', 'reaction', 'male',   'B13+B14+B15+B16+B17+B18',
  6, 6,   7, 8,   9, 12,  13, 16,  17, 24),
('抑うつ感', 'reaction', 'female', 'B13+B14+B15+B16+B17+B18',
  6, 6,   7, 8,   9, 12,  13, 17,  18, 24),

-- 身体愁訴: B19〜B29合計  得点範囲 11〜44
('身体愁訴', 'reaction', 'male',   'B19+B20+...+B29',
  11, 11,  12, 15,  16, 21,  22, 26,  27, 44),
('身体愁訴', 'reaction', 'female', 'B19+B20+...+B29',
  11, 13,  14, 17,  18, 23,  24, 29,  30, 44),

-- ============================================================
-- 【C領域】ストレス反応に影響を与える他の因子（3尺度）
-- ============================================================

-- 上司からのサポート: 15-(C1+C4+C7)  得点範囲 3〜12
('上司からのサポート', 'support', 'male',   '15-(C1+C4+C7)',
  3, 4,   5, 6,   7, 8,   9, 10,  11, 12),
('上司からのサポート', 'support', 'female', '15-(C1+C4+C7)',
  3, 3,   4, 5,   6, 7,   8, 10,  11, 12),

-- 同僚からのサポート: 15-(C2+C5+C8)  得点範囲 3〜12
('同僚からのサポート', 'support', 'male',   '15-(C2+C5+C8)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),
('同僚からのサポート', 'support', 'female', '15-(C2+C5+C8)',
  3, 5,   6, 7,   8, 9,  10, 11,  12, 12),

-- 家族・友人からのサポート: 15-(C3+C6+C9)  得点範囲 3〜12
('家族・友人からのサポート', 'support', 'male',   '15-(C3+C6+C9)',
  3, 6,   7, 8,   9, 9,  10, 11,  12, 12),
('家族・友人からのサポート', 'support', 'female', '15-(C3+C6+C9)',
  3, 6,   7, 8,   9, 9,  10, 11,  12, 12),

-- ============================================================
-- 【D領域】仕事や生活の満足度（1尺度）
-- ============================================================

-- 仕事や生活の満足度: 10-(D1+D2)  得点範囲 2〜8
('仕事や生活の満足度', 'satisfaction', 'male',   '10-(D1+D2)',
  2, 3,   4, 4,   5, 6,   7, 7,   8, 8),
('仕事や生活の満足度', 'satisfaction', 'female', '10-(D1+D2)',
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

-- ============================================================
-- 期待される結果:
--   換算表マスタ: 38 (19尺度 × 男女)
--   results:      0
--   submissions:  0
--   responses:    0
-- ============================================================

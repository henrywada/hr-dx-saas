-- 未使用 draft テンプレートコースの削除
-- 背景: 並行 /learning-modules システムの残骸（2026-04-22/24 作成）。
--       draft・tenant_id IS NULL・テナントコピー実績なしを確認済み。
-- 対象:
--   cfb79086-77c7-42a8-ba58-95fd7b629c65  01. ハラスメントの基本
--   fb56dcbc-6562-4187-87a6-2b6a6ea50d50  職場ハラスメント対策：事業主の措置義務と実務ガイド
-- 想定削除件数: el_quiz_options 0 / el_quiz_questions 0 / el_slides 16 / el_courses 2
-- 正規10コース（aaaaaaaa-0001〜0010）およびテナントコースには触れない。

-- 1. el_quiz_options（対象 slide に紐づく question 経由。想定 0 件）
DELETE FROM public.el_quiz_options o
USING public.el_quiz_questions q
JOIN public.el_slides s ON s.id = q.slide_id
WHERE o.question_id = q.id
  AND s.course_id IN (
    'cfb79086-77c7-42a8-ba58-95fd7b629c65'::uuid,
    'fb56dcbc-6562-4187-87a6-2b6a6ea50d50'::uuid
  );

-- 2. el_quiz_questions（対象 slide 経由。想定 0 件）
DELETE FROM public.el_quiz_questions q
USING public.el_slides s
WHERE q.slide_id = s.id
  AND s.course_id IN (
    'cfb79086-77c7-42a8-ba58-95fd7b629c65'::uuid,
    'fb56dcbc-6562-4187-87a6-2b6a6ea50d50'::uuid
  );

-- 3. el_slides（想定 16 件）
DELETE FROM public.el_slides
WHERE course_id IN (
  'cfb79086-77c7-42a8-ba58-95fd7b629c65'::uuid,
  'fb56dcbc-6562-4187-87a6-2b6a6ea50d50'::uuid
);

-- 4. el_courses 本体（想定 2 件）
DELETE FROM public.el_courses
WHERE id IN (
  'cfb79086-77c7-42a8-ba58-95fd7b629c65'::uuid,
  'fb56dcbc-6562-4187-87a6-2b6a6ea50d50'::uuid
);

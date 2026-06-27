-- v1時代に作成された相談で、すでにスタッフからの返信が付いているものは
-- claimed_by を補完する。補完しないと、新RLS（consultation_replies は
-- claimed_by IS NOT NULL を要求）により会話の続行が不可能になってしまう
-- （v2移行による既存データの凍結を防ぐ）。
-- 未対応・返信なしの行は claimed_by を補完しない（新しいclaimフローで
-- 改めて「対応します」を選んでもらう想定で問題ない）。

UPDATE public.consultations c
SET claimed_by = (
  SELECT r.author_employee_id
  FROM public.consultation_replies r
  WHERE r.consultation_id = c.id AND r.is_staff_reply = true
  ORDER BY r.created_at DESC
  LIMIT 1
),
claimed_at = now()
WHERE c.claimed_by IS NULL
  AND EXISTS (
    SELECT 1 FROM public.consultation_replies r
    WHERE r.consultation_id = c.id AND r.is_staff_reply = true
  );

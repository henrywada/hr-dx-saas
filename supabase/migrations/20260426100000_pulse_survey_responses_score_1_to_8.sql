-- パルス回答スコアの上限を 5 から 8 に拡張（単一選択の選択肢数・将来の尺度拡張に対応）
ALTER TABLE public.pulse_survey_responses
  DROP CONSTRAINT IF EXISTS pulse_survey_responses_score_check;

ALTER TABLE public.pulse_survey_responses
  ADD CONSTRAINT pulse_survey_responses_score_check
  CHECK (score IS NULL OR (score >= 1 AND score <= 8));

COMMENT ON COLUMN public.pulse_survey_responses.score IS
  '1〜8。評価表の5段階は1-5、単一選択は選択肢順の1-n（最大8）';

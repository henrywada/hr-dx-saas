-- pulse_survey_responses.score を 1〜10 に拡張（10段階評価・単一選択最大10件）
ALTER TABLE public.pulse_survey_responses
  DROP CONSTRAINT IF EXISTS pulse_survey_responses_score_check;

ALTER TABLE public.pulse_survey_responses
  ADD CONSTRAINT pulse_survey_responses_score_check
  CHECK (score IS NULL OR (score >= 1 AND score <= 10));

COMMENT ON COLUMN public.pulse_survey_responses.score IS
  '1〜10。評価表は10段階（1-10）、単一選択は選択肢順の1-n（最大10）';

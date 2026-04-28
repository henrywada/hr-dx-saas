-- questionnaire_periods に人事メッセージカラムを追加
ALTER TABLE public.questionnaire_periods
  ADD COLUMN IF NOT EXISTS hr_message TEXT;

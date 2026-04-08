-- =============================================================================
-- ストレスチェック結果がなくても産業医面談予約ができるようにする
-- stress_result_id カラムの NOT NULL 制約を解除
-- =============================================================================

ALTER TABLE public.stress_interview_records
ALTER COLUMN stress_result_id DROP NOT NULL;

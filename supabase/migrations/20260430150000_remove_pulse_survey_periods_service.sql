-- /adm/pulse-survey-periods 画面を廃止（実施間隔は /adm/tenant_questionnaire の本番指定モーダルに統合）
-- service レコードを削除すると app_role_service / tenant_service は CASCADE で連動削除される
DELETE FROM public.service
WHERE route_path = '/adm/pulse-survey-periods';

-- pulse_survey_periods テーブル・RLS・データは従業員ダッシュボード / program_targets で引き続き使用するため残す

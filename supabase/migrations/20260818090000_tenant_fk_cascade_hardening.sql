-- =============================================================
-- テナント削除時の CASCADE 網羅化
--
--   目的: /saas_adm/tenants からのテナント削除で、tenants 行を DELETE した際に
--         関連するトランザクションデータが漏れなく自動削除されるようにする。
--
--   背景: tenant_id -> tenants.id の外部キーを全マイグレーションから機械的に
--         抽出・検証した結果、以下の2種類の欠落が見つかった。
--
--   Part A: 外部キー制約はあるが ON DELETE 未指定（デフォルト RESTRICT）のため、
--           該当データが1行でも残っているとテナント削除が外部キー違反で失敗する
--           （評価・OKR・1on1・キャリア面談・離職リスク・ライフサイクル・
--             リファラル採用・研修計画等、約42テーブル）。
--   Part B: 外部キー制約自体が存在せず、テナント削除を妨げない代わりに
--           データが物理的に孤立して残り続ける（勤怠締め・テレワーク・MYOU等、
--           約15テーブル）。Part B は新規に制約を追加するため、既存データに
--           孤児行（tenants に存在しない tenant_id）が無いことを事前ガードで
--           確認してから追加する。
--
--   対象外: grant_llm_usage.tenant_id は ON DELETE SET NULL のまま維持する
--           （助成金AI利用ログの課金・監査証跡として意図的な設計の可能性が
--             あるため、本マイグレーションでは変更しない）。
--
--   注意: 本番調査で、マイグレーション履歴上は適用済みだが実テーブルが
--         存在しない3ファイル分・8テーブル（lifecycle_instances/
--         lifecycle_task_templates/lifecycle_tasks、training_plan_templates/
--         training_plan_template_courses/employee_training_plans、
--         turnover_risk_scores/turnover_risk_action_logs）が見つかった。
--         これは本マイグレーションと無関係な既存のスキーマドリフトのため、
--         Part A は対象テーブルが存在しない場合は RAISE NOTICE でスキップする
--         （欠落テーブル自体の復元は別途調査・対応する）。
-- =============================================================

-- -------------------------------------------------------------
-- Part A: FK制約はあるが CASCADE 未設定のテーブルを CASCADE 化
-- -------------------------------------------------------------

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'auto_distribution_logs',
    'auto_distribution_rules',
    'awards',
    'career_discussion_appointments',
    'career_discussion_theme_templates',
    'career_discussions',
    'checkins',
    'condition_checkins',
    'consultations',
    'employee_training_plans',
    'engagement_department_alerts',
    'engagement_department_scores',
    'evaluation_flow_logs',
    'evaluation_goals',
    'evaluation_periods',
    'evaluation_reminders',
    'evaluation_scores',
    'evaluation_sheets',
    'evaluation_template_items',
    'evaluation_templates',
    'grade_evaluation_criteria',
    'internal_events',
    'key_results',
    'kudos',
    'lifecycle_instances',
    'lifecycle_task_templates',
    'lifecycle_tasks',
    'objectives',
    'one_on_one_sessions',
    'one_on_one_theme_templates',
    'one_on_one_upcoming',
    'questionnaire_responses',
    'referral_nominations',
    'referral_postings',
    'referral_rewards',
    'skill_consultations',
    'skill_growth_milestones',
    'training_plan_template_courses',
    'training_plan_templates',
    'turnover_risk_action_logs',
    'turnover_risk_alerts',
    'turnover_risk_scores'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'テーブル public.% が存在しないためスキップします（既存のスキーマドリフト、別途調査が必要）', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      t, t || '_tenant_id_fkey'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE',
      t, t || '_tenant_id_fkey'
    );
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- Part B: FK制約が存在しないテーブルに CASCADE 付き制約を新規追加
-- -------------------------------------------------------------

-- 事前ガード: tenants に存在しない tenant_id を持つ孤児行が無いことを確認する
DO $$
DECLARE
  t text;
  orphan_count integer;
  tables text[] := ARRAY[
    'closure_audit_logs',
    'closure_warnings',
    'monthly_employee_overtime',
    'timecard_corrections',
    'myou_alert_logs',
    'myou_companies',
    'myou_delivery_logs',
    'myou_lots',
    'myou_trace_labels',
    'telework_sessions',
    'telework_pc_devices',
    'telework_pc_logs',
    'telework_activity_stats',
    'telework_audit_logs',
    'questionnaire_periods'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I x WHERE NOT EXISTS (SELECT 1 FROM public.tenants tt WHERE tt.id = x.tenant_id)',
      t
    ) INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE EXCEPTION '% に tenants に存在しない tenant_id を持つ孤児行が % 件あります。手動で解消してから再実行してください。', t, orphan_count;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'closure_audit_logs',
    'closure_warnings',
    'monthly_employee_overtime',
    'timecard_corrections',
    'myou_alert_logs',
    'myou_companies',
    'myou_delivery_logs',
    'myou_lots',
    'myou_trace_labels',
    'telework_sessions',
    'telework_pc_devices',
    'telework_pc_logs',
    'telework_activity_stats',
    'telework_audit_logs',
    'questionnaire_periods'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE',
      t, t || '_tenant_id_fkey'
    );
  END LOOP;
END $$;

-- テーブル整理: コメント未設定のテーブルに「[ドメイン] 説明」形式の COMMENT を付与する
-- COMMENT のみでデータ・RLS・制約には一切影響しない（取り消しは COMMENT ... IS NULL）
-- ドメイン名は scripts/generate_table_catalog.ts の DOMAIN_RULES と揃える
-- [未使用候補 2026-09] はアプリコード・DB関数のどちらからも参照されていないもの（削除はしない）

-- テナント・契約・プラン・権限
COMMENT ON TABLE public.tenants IS '[テナント・契約・プラン・権限] テナント（契約企業）の基本情報・プラン・契約状態';
COMMENT ON TABLE public.tenant_service IS '[テナント・契約・プラン・権限] テナントごとの利用サービス（開始日・状態）';
COMMENT ON TABLE public.app_role IS '[テナント・契約・プラン・権限] 権限・役割マスタ（employees.app_role_id の参照先）';
COMMENT ON TABLE public.app_role_service IS '[テナント・契約・プラン・権限] 役割ごとに利用可能なサービスの対応表';
COMMENT ON TABLE public.service IS '[テナント・契約・プラン・権限] サービス（画面・機能）マスタ。route_path でメニューと画面を対応付ける';
COMMENT ON TABLE public.service_category IS '[テナント・契約・プラン・権限] サービスの区分マスタ（メニューのカテゴリ）';
COMMENT ON TABLE public.service_class IS '[テナント・契約・プラン・権限] サービス区分をまとめる上位分類マスタ';
COMMENT ON TABLE public.service_class_index IS '[テナント・契約・プラン・権限] service_class と service_category の対応表';

-- 組織・従業員
COMMENT ON TABLE public.divisions IS '[組織・従業員] 組織（部署）階層。layer=階層番号、parent_id=親組織';
COMMENT ON TABLE public.employees IS '[組織・従業員] 従業員マスタ（所属・役割・auth ユーザーとの紐付け）';
COMMENT ON TABLE public.employee_approvers IS '[組織・従業員] 従業員ごとの承認者設定';

-- ログ・監査
COMMENT ON TABLE public.ai_usage_logs IS '[ログ・監査] AI 機能の利用ログ（機能名・利用量）';

-- ストレスチェック・産業医
COMMENT ON TABLE public.stress_check_high_stress_criteria IS '[ストレスチェック・産業医] 高ストレス者の判定基準マスタ [未使用候補 2026-09]';
COMMENT ON TABLE public.stress_check_response_options IS '[ストレスチェック・産業医] 回答選択肢マスタ（尺度別の点数とラベル） [未使用候補 2026-09]';
COMMENT ON TABLE public.stress_check_scale_conversions IS '[ストレスチェック・産業医] 尺度の素点から5段階評価への換算表（性別別） [未使用候補 2026-09]';

-- 勤怠・残業・QR打刻
COMMENT ON TABLE public.monthly_employee_overtime IS '[勤怠・残業・QR打刻] 月次締め時点の従業員別 労働時間・残業時間の集計';
COMMENT ON TABLE public.closure_audit_logs IS '[勤怠・残業・QR打刻] 月次締め処理の操作履歴';
COMMENT ON TABLE public.closure_warnings IS '[勤怠・残業・QR打刻] 月次締め時に検出した従業員別の警告（上限超過など）';
COMMENT ON TABLE public.timecard_corrections IS '[勤怠・残業・QR打刻] 打刻修正の履歴（修正前後の出退勤時刻と理由）';

-- パルス・アンケート・コンディション
COMMENT ON TABLE public.pulse_templates IS '[パルス・アンケート・コンディション] 候補者パルスの設問テンプレート（candidate_pulses から参照）';
COMMENT ON TABLE public.survey_questions IS '[パルス・アンケート・コンディション] 旧方式のサーベイ設問（pulse_survey_questions 導入前の方式）';
COMMENT ON TABLE public.survey_responses IS '[パルス・アンケート・コンディション] 旧方式のサーベイ回答（survey_questions に対応）';
COMMENT ON TABLE public.questionnaires IS '[パルス・アンケート・コンディション] アンケート本体（タイトル・目的・公開状態）';
COMMENT ON TABLE public.questionnaire_sections IS '[パルス・アンケート・コンディション] アンケートのセクション';
COMMENT ON TABLE public.questionnaire_questions IS '[パルス・アンケート・コンディション] アンケートの設問';
COMMENT ON TABLE public.questionnaire_question_items IS '[パルス・アンケート・コンディション] マトリクス形式設問の行項目';
COMMENT ON TABLE public.questionnaire_question_options IS '[パルス・アンケート・コンディション] 選択式設問の選択肢';
COMMENT ON TABLE public.questionnaire_periods IS '[パルス・アンケート・コンディション] アンケートの実施期間（回）';
COMMENT ON TABLE public.questionnaire_assignments IS '[パルス・アンケート・コンディション] アンケートの配信先（従業員・回答期限）';
COMMENT ON TABLE public.questionnaire_responses IS '[パルス・アンケート・コンディション] アンケートの回答ヘッダ（誰がいつ提出したか）';
COMMENT ON TABLE public.questionnaire_answers IS '[パルス・アンケート・コンディション] アンケートの設問別回答明細';
COMMENT ON TABLE public.auto_distribution_rules IS '[パルス・アンケート・コンディション] 情報記事の自動配信ルール（検索テーマ・配信先・スケジュール）';
COMMENT ON TABLE public.auto_distribution_logs IS '[パルス・アンケート・コンディション] 情報記事の自動配信の実行履歴';
COMMENT ON TABLE public.engagement_department_scores IS '[パルス・アンケート・コンディション] 部署別エンゲージメント総合スコアの算出結果';
COMMENT ON TABLE public.engagement_department_alerts IS '[パルス・アンケート・コンディション] 部署別エンゲージメント低下アラートの通知履歴';
COMMENT ON TABLE public.condition_checkins IS '[パルス・アンケート・コンディション] 従業員の日々のコンディション記録（スコア・メモ）';
COMMENT ON TABLE public.workplace_improvement_plans IS '[パルス・アンケート・コンディション] AI 提案をもとにした部署別の職場改善計画と効果測定';

-- 1on1・キャリア面談・相談
COMMENT ON TABLE public.one_on_one_sessions IS '[1on1・キャリア面談・相談] 実施済み 1on1 の記録（テーマ・メモ・AI 要約）';
COMMENT ON TABLE public.one_on_one_upcoming IS '[1on1・キャリア面談・相談] 予定されている 1on1（日時・アジェンダ・リマインド）';
COMMENT ON TABLE public.one_on_one_theme_templates IS '[1on1・キャリア面談・相談] 1on1 のテーマテンプレート';
COMMENT ON TABLE public.career_discussions IS '[1on1・キャリア面談・相談] 実施済みキャリア面談の記録';
COMMENT ON TABLE public.career_discussion_appointments IS '[1on1・キャリア面談・相談] キャリア面談の予約';
COMMENT ON TABLE public.career_discussion_theme_templates IS '[1on1・キャリア面談・相談] キャリア面談のテーマテンプレート';
COMMENT ON TABLE public.consultations IS '[1on1・キャリア面談・相談] 従業員からの相談（匿名可）と対応状況';
COMMENT ON TABLE public.consultation_replies IS '[1on1・キャリア面談・相談] 相談へのやり取り（担当者・相談者の返信）';

-- 人事評価・OKR・360度
COMMENT ON TABLE public.evaluation_periods IS '[人事評価・OKR・360度] 評価期間（年度・目標設定期限・各評価期限）';
COMMENT ON TABLE public.evaluation_templates IS '[人事評価・OKR・360度] テナントの評価テンプレート（グローバルテンプレートからコピー可）';
COMMENT ON TABLE public.evaluation_template_items IS '[人事評価・OKR・360度] 評価テンプレートの評価項目（軸・ウェイト・対象等級）';
COMMENT ON TABLE public.evaluation_sheets IS '[人事評価・OKR・360度] 従業員ごとの評価シート（評価者・フロー状態・最終評価）';
COMMENT ON TABLE public.evaluation_goals IS '[人事評価・OKR・360度] 評価シートの目標（MBO の KPI・ウェイト・期限）';
COMMENT ON TABLE public.evaluation_scores IS '[人事評価・OKR・360度] 評価項目・目標ごとの評価点（本人・一次・二次）';
COMMENT ON TABLE public.evaluation_flow_logs IS '[人事評価・OKR・360度] 評価シートのステータス遷移履歴';
COMMENT ON TABLE public.evaluation_reminders IS '[人事評価・OKR・360度] 評価の督促（リマインド）送信履歴';
COMMENT ON TABLE public.global_evaluation_template_items IS '[人事評価・OKR・360度] SaaS 共通の評価テンプレート項目';
COMMENT ON TABLE public.grade_evaluation_criteria IS '[人事評価・OKR・360度] 等級別・評価点別の評価基準文 [未使用候補 2026-09]';
COMMENT ON TABLE public.objectives IS '[人事評価・OKR・360度] OKR の目標（Objective。個人・部署、親子階層あり）';
COMMENT ON TABLE public.key_results IS '[人事評価・OKR・360度] OKR の主要な成果（Key Result。目標値・進捗）';
COMMENT ON TABLE public.checkins IS '[人事評価・OKR・360度] Key Result の進捗チェックイン（自信度・現在値）';
COMMENT ON TABLE public.review_360_campaigns IS '[人事評価・OKR・360度] 360度評価の実施キャンペーン';
COMMENT ON TABLE public.review_360_questions IS '[人事評価・OKR・360度] 360度評価の設問';
COMMENT ON TABLE public.review_360_subjects IS '[人事評価・OKR・360度] 360度評価の被評価者';
COMMENT ON TABLE public.review_360_reviewers IS '[人事評価・OKR・360度] 360度評価の評価者（被評価者ごとの割り当て）';
COMMENT ON TABLE public.review_360_responses IS '[人事評価・OKR・360度] 360度評価の回答（設問別スコア・コメント）';

-- スキル・資格・研修計画
COMMENT ON TABLE public.tenant_skills IS '[スキル・資格・研修計画] テナントのスキル（職種・役割）マスタ';
COMMENT ON TABLE public.skill_levels IS '[スキル・資格・研修計画] テナントのスキルレベル定義';
COMMENT ON TABLE public.global_skill_levels IS '[スキル・資格・研修計画] SaaS 共通のスキルレベル定義';
COMMENT ON TABLE public.skill_requirements IS '[スキル・資格・研修計画] スキルごとの要件（習得すべき項目とレベル）';
COMMENT ON TABLE public.skill_requirement_applications IS '[スキル・資格・研修計画] スキル要件の達成申請と承認（上長・人事）';
COMMENT ON TABLE public.skill_role_applications IS '[スキル・資格・研修計画] スキル（役割）取得の申請と承認（上長・人事）';
COMMENT ON TABLE public.skill_consultations IS '[スキル・資格・研修計画] スキル・キャリアに関する上長への相談と回答';
COMMENT ON TABLE public.skill_feedback_comments IS '[スキル・資格・研修計画] スキル関連のフィードバックコメント';
COMMENT ON TABLE public.skill_growth_milestones IS '[スキル・資格・研修計画] 従業員の成長マイルストーン';
COMMENT ON TABLE public.employee_skill_assignments IS '[スキル・資格・研修計画] 従業員へのスキル（役割）割り当て';
COMMENT ON TABLE public.employee_skill_level_achievements IS '[スキル・資格・研修計画] 従業員のスキルレベル達成記録';
COMMENT ON TABLE public.employee_skill_requirement_history IS '[スキル・資格・研修計画] スキル要件の達成率の推移（スナップショット）';
COMMENT ON TABLE public.employee_skill_requirement_selections IS '[スキル・資格・研修計画] 従業員が取り組む対象として選んだスキル要件';
COMMENT ON TABLE public.employee_skill_self_evaluations IS '[スキル・資格・研修計画] スキル要件ごとの自己評価';
COMMENT ON TABLE public.employee_career_goals IS '[スキル・資格・研修計画] 従業員のキャリア目標（目標スキル・時期・合意状況）';
COMMENT ON TABLE public.employee_recommended_courses IS '[スキル・資格・研修計画] 上長等から従業員への推奨講座';
COMMENT ON TABLE public.employee_training_plans IS '[スキル・資格・研修計画] 従業員に割り当てた研修計画';
COMMENT ON TABLE public.training_plan_templates IS '[スキル・資格・研修計画] 研修計画テンプレート（スキル別）';
COMMENT ON TABLE public.training_plan_template_courses IS '[スキル・資格・研修計画] 研修計画テンプレートに含まれる講座';

-- eラーニング
COMMENT ON TABLE public.el_courses IS '[eラーニング] 講座マスタ（公開期間・形式・学習目標）';
COMMENT ON TABLE public.el_slides IS '[eラーニング] 講座のスライド（テキスト・画像・動画・音声）';
COMMENT ON TABLE public.el_quiz_questions IS '[eラーニング] スライドに紐づく確認テストの設問';
COMMENT ON TABLE public.el_quiz_options IS '[eラーニング] 確認テストの選択肢';
COMMENT ON TABLE public.el_assignments IS '[eラーニング] 講座の受講割り当て（期限・修了日）';
COMMENT ON TABLE public.el_progress IS '[eラーニング] スライド単位の受講進捗・テスト結果';
COMMENT ON TABLE public.el_learning_preferences IS '[eラーニング] 受講者ごとの学習設定（音声・字幕）';
COMMENT ON TABLE public.el_course_requirement_mappings IS '[eラーニング] 講座とスキル要件の対応表';
COMMENT ON TABLE public.el_course_skill_level_mappings IS '[eラーニング] 講座とスキルレベルの対応表';
COMMENT ON TABLE public.el_scorm_packages IS '[eラーニング] SCORM/xAPI パッケージの格納情報（講座単位）';
COMMENT ON TABLE public.el_scorm_runtime IS '[eラーニング] SCORM 受講の実行時データ（cmi・中断データ）';
COMMENT ON TABLE public.el_xapi_statements IS '[eラーニング] xAPI ステートメントの記録';

-- 採用・リファラル
COMMENT ON TABLE public.job_postings IS '[採用・リファラル] 求人票';
COMMENT ON TABLE public.job_posting_ai_variants IS '[採用・リファラル] 求人票の AI 生成バリエーション（媒体別）';
COMMENT ON TABLE public.candidates IS '[採用・リファラル] 応募者（候補者）と選考ステージ';
COMMENT ON TABLE public.candidate_pulses IS '[採用・リファラル] 候補者の選考体験パルス（懸念・感情スコア）';
COMMENT ON TABLE public.referral_postings IS '[採用・リファラル] リファラル募集（報酬条件つき）';
COMMENT ON TABLE public.referral_nominations IS '[採用・リファラル] 従業員からのリファラル推薦';
COMMENT ON TABLE public.referral_rewards IS '[採用・リファラル] リファラル報酬の承認・支払状況';

-- 離職リスク・ライフサイクル
COMMENT ON TABLE public.turnover_risk_scores IS '[離職リスク・ライフサイクル] 従業員別の離職リスクスコア算出結果';
COMMENT ON TABLE public.turnover_risk_alerts IS '[離職リスク・ライフサイクル] 離職リスク上昇アラートの通知履歴';
COMMENT ON TABLE public.turnover_risk_action_logs IS '[離職リスク・ライフサイクル] 離職リスクへの対応記録';
COMMENT ON TABLE public.exit_interviews IS '[離職リスク・ライフサイクル] 退職者インタビュー（退職理由など）';
COMMENT ON TABLE public.lifecycle_instances IS '[離職リスク・ライフサイクル] 入社・退職などのライフサイクル手続きの実施単位';
COMMENT ON TABLE public.lifecycle_tasks IS '[離職リスク・ライフサイクル] ライフサイクル手続きの個別タスク';
COMMENT ON TABLE public.lifecycle_task_templates IS '[離職リスク・ライフサイクル] ライフサイクル手続きのタスクテンプレート';

-- 人員計画・後継者
COMMENT ON TABLE public.project_simulations IS '[人員計画・後継者] 人員配置シミュレーション';
COMMENT ON TABLE public.simulation_positions IS '[人員計画・後継者] シミュレーション内のポジション';
COMMENT ON TABLE public.simulation_position_requirements IS '[人員計画・後継者] ポジションに必要なスキル要件';
COMMENT ON TABLE public.simulation_assigned_members IS '[人員計画・後継者] ポジションへの配置メンバー';
COMMENT ON TABLE public.succession_positions IS '[人員計画・後継者] 後継者計画の対象ポジション';
COMMENT ON TABLE public.succession_candidates IS '[人員計画・後継者] ポジションごとの後継者候補（準備度・評価）';

-- 称賛・表彰・社内イベント
COMMENT ON TABLE public.kudos IS '[称賛・表彰・社内イベント] 従業員間の称賛メッセージ';
COMMENT ON TABLE public.kudos_recipients IS '[称賛・表彰・社内イベント] 称賛の受け手';
COMMENT ON TABLE public.kudos_reactions IS '[称賛・表彰・社内イベント] 称賛へのリアクション';
COMMENT ON TABLE public.kudos_value_tags IS '[称賛・表彰・社内イベント] 称賛に付けるバリュータグのマスタ';
COMMENT ON TABLE public.awards IS '[称賛・表彰・社内イベント] 表彰の記録';
COMMENT ON TABLE public.internal_events IS '[称賛・表彰・社内イベント] 社内イベント';
COMMENT ON TABLE public.internal_event_attendees IS '[称賛・表彰・社内イベント] 社内イベントの出欠';

-- AI・法令・RAG
COMMENT ON TABLE public.hr_law_sources IS '[AI・法令・RAG] 法令情報の収集元（検索トピック・クエリ）';
COMMENT ON TABLE public.hr_law_crawl_queue IS '[AI・法令・RAG] 法令情報のクロール待ち URL キュー';
COMMENT ON TABLE public.hr_law_documents IS '[AI・法令・RAG] 収集した法令・行政情報の文書';
COMMENT ON TABLE public.hr_law_chunks IS '[AI・法令・RAG] 法令文書のチャンクと埋め込みベクトル';
COMMENT ON TABLE public.tenant_rag_documents IS '[AI・法令・RAG] テナントがアップロードした社内規程等の文書';
COMMENT ON TABLE public.tenant_rag_chunks IS '[AI・法令・RAG] テナント文書のチャンクと埋め込みベクトル';
COMMENT ON TABLE public.tenant_rag_audit_logs IS '[AI・法令・RAG] テナント文書の操作履歴';
COMMENT ON TABLE public.tenant_hr_assistant_sessions IS '[AI・法令・RAG] AI 人事アシスタントの会話セッション';
COMMENT ON TABLE public.tenant_hr_assistant_messages IS '[AI・法令・RAG] AI 人事アシスタントの会話メッセージ';
COMMENT ON TABLE public.tenant_hr_assistant_templates IS '[AI・法令・RAG] AI 人事アシスタントの質問テンプレート';
COMMENT ON TABLE public.tenant_inquiry_chat_sessions IS '[AI・法令・RAG] 社内問い合わせチャットの会話セッション';
COMMENT ON TABLE public.tenant_inquiry_chat_messages IS '[AI・法令・RAG] 社内問い合わせチャットの会話メッセージ';

-- mYou（別製品）
COMMENT ON TABLE public.myou_companies IS '[mYou（別製品）] 取引先企業マスタ';
COMMENT ON TABLE public.myou_delivery_logs IS '[mYou（別製品）] ロットの納品履歴（トレース番号・数量・期限）';
COMMENT ON TABLE public.myou_alert_logs IS '[mYou（別製品）] 取引先へのアラート送信履歴';

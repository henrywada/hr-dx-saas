# DBテーブル台帳（public スキーマ）

> 自動生成: `npx tsx scripts/generate_table_catalog.ts`（2026/9/27 20:37:13 時点・ローカルDB）。手で編集しないこと。
> 行数はローカルDBの実件数で、本番の件数ではない。

## サマリ

- テーブル数: **237**
- ドメイン数: **23**
- コメントなし: **0**
- 未使用候補（コード参照0・DB関数参照0）: **10**

| ドメイン | テーブル数 |
|---|--:|
| [テナント・契約・プラン・権限](#テナント・契約・プラン・権限) | 13 |
| [組織・従業員](#組織・従業員) | 6 |
| [ダッシュボード・お知らせ](#ダッシュボード・お知らせ) | 4 |
| [ログ・監査](#ログ・監査) | 2 |
| [ストレスチェック・産業医](#ストレスチェック・産業医) | 15 |
| [健康診断](#健康診断) | 14 |
| [勤怠・残業・QR打刻](#勤怠・残業・QR打刻) | 16 |
| [テレワーク](#テレワーク) | 5 |
| [パルス・アンケート・コンディション](#パルス・アンケート・コンディション) | 21 |
| [1on1・キャリア面談・相談](#1on1・キャリア面談・相談) | 8 |
| [人事評価・OKR・360度](#人事評価・OKR・360度) | 19 |
| [スキル・資格・研修計画](#スキル・資格・研修計画) | 24 |
| [eラーニング](#eラーニング) | 15 |
| [採用・リファラル](#採用・リファラル) | 8 |
| [離職リスク・ライフサイクル](#離職リスク・ライフサイクル) | 7 |
| [人員計画・後継者](#人員計画・後継者) | 6 |
| [称賛・表彰・社内イベント](#称賛・表彰・社内イベント) | 7 |
| [タスク管理](#タスク管理) | 10 |
| [AI・法令・RAG](#AI・法令・RAG) | 15 |
| [助成金](#助成金) | 9 |
| [LINE連携](#LINE連携) | 2 |
| [書類・画像取込](#書類・画像取込) | 5 |
| [mYou（別製品）](#mYou（別製品）) | 6 |

## テナント・契約・プラン・権限

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `app_role` | [テナント・契約・プラン・権限] 権限・役割マスタ（employees.app_role_id の参照先） | 8 | 14 | 5 | features/data-migration, features/organization, features/signup, features/system-master, features/tenant-management, functions/qr-admin-bulkimportpermissions, src/app/(tenant), src/app/api, src/components/layout, src/lib/auth |
| `app_role_service` | [テナント・契約・プラン・権限] 役割ごとに利用可能なサービスの対応表 | 336 | 14 | 0 | features/system-master, src/app/(tenant), src/components/layout |
| `plan_config` | セルフサインアップ用プラン条件マスタ。コードの PLAN_CONFIG 相当 | 5 | 2 | 0 | features/plan-config |
| `service` | [テナント・契約・プラン・権限] サービス（画面・機能）マスタ。route_path でメニューと画面を対応付ける | 147 | 17 | 0 | features/dashboard, features/login-logs, features/saas-dashboard, features/system-master, src/app/(saas-admin), src/app/(tenant), src/app/api, src/components/layout, src/lib/menu-service.ts |
| `service_assignments` | サービスの親定義（テナント単位） | 0 | 5 | 1 | features/service-assignments |
| `service_assignments_users` | サービス対象ユーザー紐付け | 0 | 4 | 1 | features/service-assignments |
| `service_category` | [テナント・契約・プラン・権限] サービスの区分マスタ（メニューのカテゴリ） | 68 | 14 | 0 | features/system-master, src/app/(saas-admin), src/app/(tenant), src/app/api, src/lib/menu-service.ts |
| `service_class` | [テナント・契約・プラン・権限] サービス区分をまとめる上位分類マスタ | 28 | 4 | 0 | features/system-master, src/components/layout |
| `service_class_index` | [テナント・契約・プラン・権限] service_class と service_category の対応表 | 67 | 6 | 0 | features/system-master, src/components/layout |
| `tenant_contracts` | テナント申込情報の永続化・監査ログ | 1 | 11 | 0 | features/plan-config, features/signup, src/app/api |
| `tenant_portal_settings` | テナントのポータル基本設定（お問合せ先メール等） | 1 | 7 | 1 | features/dashboard, features/inquiry-chat, src/app/(tenant), src/lib/server |
| `tenant_service` | [テナント・契約・プラン・権限] テナントごとの利用サービス（開始日・状態） | 370 | 20 | 0 | features/dashboard, features/dashboard-ui-visibility, features/plan-config, features/signup, features/system-master, src/app/(tenant), src/components/layout, src/lib/menu-service.ts |
| `tenants` | [テナント・契約・プラン・権限] テナント（契約企業）の基本情報・プラン・契約状態 | 8 | 38 | 5 | features/data-migration, features/grant-notifier, features/job-postings, features/line, features/onboarding, features/organization, features/plan-config, features/saas-dashboard, features/signup, features/system-master, features/tenant-management, functions/qualification-expiry-alert, src/app/(tenant), src/app/api, src/lib/auth |

## 組織・従業員

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `division_establishment_anchors` | 拠点に紐づくアンカー部署。所属の祖先チェーンでいずれかのアンカーに一致すれば当該拠点。同一部署はテナント内で1拠点のみ | 1 | 9 | 1 | features/adm/ai-workplace-improvement, features/adm/division-establishments, features/adm/high-stress, features/adm/stress-check |
| `division_establishments` | 拠点マスタ。アンカー部署は division_establishment_anchors で複数登録 | 2 | 7 | 0 | features/adm/division-establishments, features/adm/high-stress, features/adm/stress-check |
| `divisions` | [組織・従業員] 組織（部署）階層。layer=階層番号、parent_id=親組織 | 214 | 79 | 11 | features/adm/ai-workplace-improvement, features/adm/division-establishments, features/adm/high-stress, features/adm/pulse-stress, features/adm/stress-check, features/career-discussions, features/data-migration, features/e-learning, features/engagement, features/evaluation, features/health-check, features/labor-compliance, features/lifecycle, features/okr, features/one-on-one, features/organization, features/qualifications, features/skill-map, features/skill-portal, features/stress-check, features/succession-plan, features/survey, features/task-management, features/turnover-risk, src/app/(tenant) |
| `employee_approvers` | [組織・従業員] 従業員ごとの承認者設定 | 2 | 25 | 0 | features/evaluation, features/skill-portal |
| `employees` | [組織・従業員] 従業員マスタ（所属・役割・auth ユーザーとの紐付け） | 461 | 251 | 37 | features/adm/ai-workplace-improvement, features/adm/division-establishments, features/adm/gov-report, features/adm/high-stress, features/adm/high-stress-followup, features/adm/pulse-stress, features/adm/stress-check, features/attendance, features/career-discussions, features/consultation, features/dashboard, features/data-migration, features/e-learning, features/echo-template, features/engagement, features/evaluation, features/exit-interview, features/health-check, features/hr-kpi, features/internal-events, features/job-postings, features/labor-compliance, features/lifecycle, features/line, features/okr, features/one-on-one, features/organization, features/overtime, features/qr-punch, features/qualifications, features/questionnaire, features/recognition, features/referral, features/saas-dashboard, features/service-assignments, features/signup, features/skill-map, features/skill-portal, features/stress-check, features/succession-plan, features/survey, features/task-management, features/team-connect, features/tenant-management, features/turnover-risk, features/workload-analysis, functions/_shared, functions/listpermissions, functions/qr-admin-bulkimportpermissions, functions/qr-create-session, functions/qr-scan, functions/qualification-expiry-alert, functions/telework-device-register, functions/telework-end, scripts, src/app/(tenant), src/app/api, src/lib/auth, src/lib/mail, src/lib/notifications |
| `program_targets` | 実施対象者マスタ（ストレスチェック・パルスサーベイ・アンケート・eラーニング等で共通利用） | 1 | 6 | 0 | features/adm/stress-check, features/health-check, features/stress-check |

## ダッシュボード・お知らせ

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `announcements` | 人事からのお知らせ（テナント単位） | 4 | 6 | 3 | features/condition-checkin, features/dashboard |
| `dashboard_feed_read_state` | /top 通知フィードの既読状態（従業員単位・dedupe_key単位） | 1 | 5 | 0 | features/dashboard, features/task-management |
| `tenant_ui_dashboard_element` | テナント別ダッシュボード UI 表示オーバーライド。行なし＝表示、is_visible=false で非表示 | 215 | 13 | 0 | features/dashboard-ui-visibility, features/plan-config, features/signup |
| `ui_dashboard_element` | ダッシュボード（/top・/adm）に表示する UI 要素のマスタ | 44 | 4 | 0 | features/dashboard-ui-visibility |

## ログ・監査

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `access_logs` | アクセス履歴・監査ログ（Middleware + writeAuditLog から記録） | 21293 | 6 | 7 | features/saas-dashboard, scripts, src/lib/log, src/middleware.ts |
| `ai_usage_logs` | [ログ・監査] AI 機能の利用ログ（機能名・利用量） | 20 | 2 | 1 | src/lib/ai |

## ストレスチェック・産業医

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `doctor_availability_slots` | 産業医・保健師の稼働日時スロット（面談予約制約用） | 0 | 4 | 0 | features/adm/high-stress-followup |
| `interventions` | 産業医面談等の介入記録（テナント単位） | 0 | 0 | 0 |  |
| `stress_check_group_analysis` | 集団分析結果（部署別・全社、仕事のストレス判定図データ） | 0 | 1 | 0 | features/adm/pulse-stress |
| `stress_check_high_stress_criteria` | [ストレスチェック・産業医] 高ストレス者の判定基準マスタ [未使用候補 2026-09] | 4 | 0 | 0 |  |
| `stress_check_interviews` | 面接指導記録（産業医による面接・意見・就業措置） | 0 | 7 | 0 | features/adm/gov-report, features/adm/high-stress, features/stress-check |
| `stress_check_period_divisions` | 実施グループ（stress_check_periods）と対象部署（divisions）の紐付け。       親 division を登録すると配下の全従業員が対象となる（RPC 側で ancestor 解決） | 1 | 10 | 1 | features/adm/stress-check, features/data-migration, features/stress-check |
| `stress_check_periods` | ストレスチェック実施期間（年度単位） | 2 | 28 | 2 | features/adm/ai-workplace-improvement, features/adm/division-establishments, features/adm/gov-report, features/adm/high-stress, features/adm/high-stress-followup, features/adm/stress-check, features/data-migration, features/engagement, features/hr-kpi, features/stress-check |
| `stress_check_questions` | 職業性ストレス簡易調査票 質問マスタ（57問/23問） | 57 | 5 | 0 | features/data-migration, features/stress-check, scripts |
| `stress_check_response_options` | [ストレスチェック・産業医] 回答選択肢マスタ（尺度別の点数とラベル） [未使用候補 2026-09] | 16 | 0 | 0 |  |
| `stress_check_responses` | ストレスチェック個人回答（1行=1問の回答） | 10431 | 7 | 0 | features/data-migration, features/stress-check, scripts |
| `stress_check_results` | ストレスチェック個人結果（採点・高ストレス判定） | 178 | 21 | 1 | features/adm/ai-workplace-improvement, features/adm/gov-report, features/adm/high-stress, features/adm/high-stress-followup, features/adm/pulse-stress, features/adm/stress-check, features/data-migration, features/engagement, features/hr-kpi, features/stress-check, features/turnover-risk, scripts |
| `stress_check_scale_conversions` | [ストレスチェック・産業医] 尺度の素点から5段階評価への換算表（性別別） [未使用候補 2026-09] | 38 | 0 | 0 |  |
| `stress_check_submissions` | 受検ステータス管理（途中保存・提出・同意管理） | 183 | 16 | 0 | features/adm/gov-report, features/adm/high-stress, features/adm/high-stress-followup, features/adm/stress-check, features/data-migration, features/stress-check, scripts |
| `stress_interview_records` | 高ストレス者に対する面接指導記録（厚労省マニュアル第7章準拠） | 0 | 7 | 0 | features/adm/high-stress-followup |
| `tenant_stress_settings` | テナント別ストレスチェック・集団分析の閾値（最低回答者数など） | 1 | 3 | 1 | features/adm/division-establishments, features/adm/stress-check |

## 健康診断

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `health_assessments_link` | 健康評価（ストレスチェック等）との外部連携用リンク（テナント単位） | 0 | 0 | 0 |  |
| `health_check_campaigns` | 定期健康診断の実施回（会計年度ラベル + 年1〜2回） | 1 | 8 | 1 | features/data-migration, features/health-check |
| `health_check_csv_column_maps` | 機関 × ファイル種別 × ヘッダ名 → 項目 / 役割 | 417 | 4 | 0 | features/health-check |
| `health_check_csv_format_presets` | 健診CSVフォーマットプリセット（システム）。テナントの機関へ「適用」したときだけコピーされる | 1 | 3 | 0 | features/health-check |
| `health_check_institutions` | テナントの健診機関。is_standard がそのテナントの標準（メイン機関） | 3 | 13 | 1 | features/data-migration, features/health-check |
| `health_check_item_results` | 健診項目別結果。人事は SELECT 不可（本人・産業医・保健師のみ） | 48750 | 5 | 0 | features/health-check |
| `health_check_item_thresholds` | 他機関（institution_id）の数値を標準判定へ再判定するカットオフ | 0 | 5 | 0 | features/health-check |
| `health_check_items` | 健診項目。tenant_id NULL はシステム共通語彙、非NULLはテナント追加 | 225 | 7 | 0 | features/health-check |
| `health_check_judgment_code_maps` | 同じテナントの他機関の生コード → そのテナントの標準コード。標準機関自身は不要 | 1 | 5 | 0 | features/health-check |
| `health_check_judgment_codes` | テナントの標準判定コード（メイン検診機関のもの） | 10 | 9 | 1 | features/health-check |
| `health_check_manual_form_items` | 人事の手入力フォームに表示する検査項目。未設定時はアプリ側で法定数値の既定12項目を使う | 12 | 3 | 0 | features/health-check |
| `health_check_medical_notes` | 産業医判定コード・産業医/保健師コメント。人事は不可 | 35 | 11 | 0 | features/health-check |
| `health_check_records` | 健診結果ヘッダ。検査値は持たない。人事は受診・就業判定・面談推奨のみ参照 | 442 | 18 | 2 | features/health-check |
| `health_check_unit_conversions` | 他機関（institution_id）の単位 → そのテナントの標準機関単位 | 1 | 5 | 0 | features/health-check |

## 勤怠・残業・QR打刻

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `closure_audit_logs` | [勤怠・残業・QR打刻] 月次締め処理の操作履歴 | 0 | 1 | 0 | src/app/api |
| `closure_warnings` | [勤怠・残業・QR打刻] 月次締め時に検出した従業員別の警告（上限超過など） | 0 | 8 | 1 | features/attendance, features/labor-compliance |
| `monthly_employee_overtime` | [勤怠・残業・QR打刻] 月次締め時点の従業員別 労働時間・残業時間の集計 | 91 | 10 | 6 | features/attendance, features/overtime, features/workload-analysis, src/app/(tenant), src/app/api |
| `monthly_overtime_closures` | 残業関連の月次締め（テナント単位・月1行） | 0 | 22 | 2 | features/attendance, src/app/(tenant), src/app/api, src/lib/overtime |
| `overtime_alerts` | 残業関連アラート（テナント単位） | 0 | 2 | 0 | features/hr-kpi, features/labor-compliance |
| `overtime_analysis_results` | 36協定等との比較・分析結果（テナント単位・月1行） | 0 | 0 | 0 |  |
| `overtime_applications` | 残業申請（テナント単位） | 0 | 26 | 1 | features/attendance, features/overtime, src/app/(tenant), src/app/api, src/lib/overtime |
| `overtime_corrections` | 残業申請の修正履歴（テナントは親申請に従う） | 0 | 1 | 0 | src/app/api |
| `overtime_monthly_stats` | 残業等の月次集計（テナント単位） | 0 | 6 | 0 | features/attendance, features/labor-compliance, functions/telework-end |
| `overtime_settings` | テナント単位の残業閾値（月間上限・警告・年間・2-6ヶ月平均） | 1 | 3 | 2 | src/app/(tenant), src/app/api, src/utils/overtimeThresholds.ts |
| `qr_audit_logs` | QR 打刻まわりの監査ログ | 0 | 6 | 4 | features/qr-punch, functions/qr-admin-bulkimportpermissions, functions/qr-scan, src/app/(tenant) |
| `qr_session_scans` | QR スキャン1件ごとの記録（デバイス・位置・承認結果） | 0 | 12 | 0 | features/qr-punch, functions/qr-scan |
| `qr_sessions` | QR 打刻用セッション（監督者が発行、purpose は punch_in / punch_out 等） | 0 | 17 | 0 | features/qr-punch, functions/qr-create-session, functions/qr-scan |
| `supervisor_qr_permissions` | 監督者が QR 表示を許可した従業員（テナント単位） | 0 | 7 | 4 | functions/listpermissions, functions/removepermission, src/app/(tenant) |
| `timecard_corrections` | [勤怠・残業・QR打刻] 打刻修正の履歴（修正前後の出退勤時刻と理由） | 0 | 1 | 0 | src/app/api |
| `work_time_records` | 勤怠の原始レコード（テナント単位） | 0 | 41 | 3 | features/attendance, features/hr-kpi, features/labor-compliance, features/overtime, features/qr-punch, features/turnover-risk, functions/qr-scan, functions/telework-end, src/app/(tenant), src/app/api, src/lib/overtime |

## テレワーク

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `telework_activity_stats` | 日次アクティビティ集計（テナント・ユーザー単位） | 0 | 0 | 0 |  |
| `telework_audit_logs` | テレワーク機能の監査ログ（テナント単位） | 0 | 3 | 0 | functions/_shared, functions/telework-device-approve |
| `telework_pc_devices` | テレワーク用PC端末登録（テナント単位） | 0 | 17 | 0 | functions/_shared, functions/telework-device-approve, functions/telework-device-poll-secret, functions/telework-device-register, functions/telework-pc-log-ingest, functions/telework-start, src/app/(tenant) |
| `telework_pc_logs` | PCイベントログ（テナント単位） | 0 | 2 | 0 | functions/telework-end, functions/telework-pc-log-ingest |
| `telework_sessions` | テレワーク出退勤セッション（テナント単位） | 0 | 9 | 0 | functions/telework-end, functions/telework-start, src/app/(tenant) |

## パルス・アンケート・コンディション

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `auto_distribution_logs` | [パルス・アンケート・コンディション] 情報記事の自動配信の実行履歴 | 0 | 2 | 0 | features/auto-distribution |
| `auto_distribution_rules` | [パルス・アンケート・コンディション] 情報記事の自動配信ルール（検索テーマ・配信先・スケジュール） | 0 | 7 | 0 | features/auto-distribution, src/app/api |
| `condition_checkins` | [パルス・アンケート・コンディション] 従業員の日々のコンディション記録（スコア・メモ） | 5 | 3 | 7 | features/condition-checkin |
| `engagement_department_alerts` | [パルス・アンケート・コンディション] 部署別エンゲージメント低下アラートの通知履歴 | 0 | 2 | 0 | features/engagement |
| `engagement_department_scores` | [パルス・アンケート・コンディション] 部署別エンゲージメント総合スコアの算出結果 | 0 | 2 | 0 | features/engagement |
| `pulse_survey_periods` | 月次パルス調査の期間・期限・トップの重要タスク表示用 | 0 | 2 | 0 | features/dashboard, features/hr-kpi |
| `pulse_survey_questions` | パルスサーベイ: 質問マスタ | 0 | 2 | 0 | features/survey |
| `pulse_survey_responses` | パルスサーベイ: 従業員の回答データ | 0 | 11 | 0 | features/adm/pulse-stress, features/dashboard, features/engagement, features/hr-kpi, features/one-on-one, features/survey, features/turnover-risk |
| `pulse_templates` | [パルス・アンケート・コンディション] 候補者パルスの設問テンプレート（candidate_pulses から参照） | 0 | 2 | 0 | features/candidate-pulse |
| `questionnaire_answers` | [パルス・アンケート・コンディション] アンケートの設問別回答明細 | 0 | 4 | 0 | features/questionnaire |
| `questionnaire_assignments` | [パルス・アンケート・コンディション] アンケートの配信先（従業員・回答期限） | 0 | 20 | 0 | features/engagement, features/questionnaire, features/turnover-risk |
| `questionnaire_periods` | [パルス・アンケート・コンディション] アンケートの実施期間（回） | 0 | 15 | 0 | features/engagement, features/questionnaire |
| `questionnaire_question_items` | [パルス・アンケート・コンディション] マトリクス形式設問の行項目 | 0 | 13 | 0 | features/echo-template, features/questionnaire, features/survey |
| `questionnaire_question_options` | [パルス・アンケート・コンディション] 選択式設問の選択肢 | 0 | 13 | 0 | features/echo-template, features/questionnaire, features/survey |
| `questionnaire_questions` | [パルス・アンケート・コンディション] アンケートの設問 | 0 | 21 | 0 | features/echo-template, features/questionnaire, features/survey |
| `questionnaire_responses` | [パルス・アンケート・コンディション] アンケートの回答ヘッダ（誰がいつ提出したか） | 0 | 15 | 0 | features/engagement, features/questionnaire, features/turnover-risk |
| `questionnaire_sections` | [パルス・アンケート・コンディション] アンケートのセクション | 0 | 7 | 0 | features/questionnaire, features/survey |
| `questionnaires` | [パルス・アンケート・コンディション] アンケート本体（タイトル・目的・公開状態） | 0 | 28 | 0 | features/dashboard, features/echo-template, features/questionnaire, features/survey |
| `survey_questions` | [パルス・アンケート・コンディション] 旧方式のサーベイ設問（pulse_survey_questions 導入前の方式） | 6 | 2 | 0 | features/survey |
| `survey_responses` | [パルス・アンケート・コンディション] 旧方式のサーベイ回答（survey_questions に対応） | 6 | 1 | 0 | features/survey |
| `workplace_improvement_plans` | [パルス・アンケート・コンディション] AI 提案をもとにした部署別の職場改善計画と効果測定 | 0 | 6 | 0 | features/adm/ai-workplace-improvement |

## 1on1・キャリア面談・相談

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `career_discussion_appointments` | [1on1・キャリア面談・相談] キャリア面談の予約 | 0 | 5 | 0 | features/career-discussions |
| `career_discussion_theme_templates` | [1on1・キャリア面談・相談] キャリア面談のテーマテンプレート | 0 | 5 | 0 | features/career-discussions |
| `career_discussions` | [1on1・キャリア面談・相談] 実施済みキャリア面談の記録 | 0 | 7 | 0 | features/career-discussions, features/hr-kpi |
| `consultation_replies` | [1on1・キャリア面談・相談] 相談へのやり取り（担当者・相談者の返信） | 1 | 2 | 0 | features/consultation |
| `consultations` | [1on1・キャリア面談・相談] 従業員からの相談（匿名可）と対応状況 | 1 | 10 | 0 | features/consultation |
| `one_on_one_sessions` | [1on1・キャリア面談・相談] 実施済み 1on1 の記録（テーマ・メモ・AI 要約） | 0 | 15 | 1 | features/career-discussions, features/one-on-one, features/turnover-risk |
| `one_on_one_theme_templates` | [1on1・キャリア面談・相談] 1on1 のテーマテンプレート | 5 | 5 | 0 | features/one-on-one |
| `one_on_one_upcoming` | [1on1・キャリア面談・相談] 予定されている 1on1（日時・アジェンダ・リマインド） | 0 | 6 | 1 | features/one-on-one |

## 人事評価・OKR・360度

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `checkins` | [人事評価・OKR・360度] Key Result の進捗チェックイン（自信度・現在値） | 0 | 3 | 0 | features/okr |
| `evaluation_flow_logs` | [人事評価・OKR・360度] 評価シートのステータス遷移履歴 | 0 | 2 | 0 | features/evaluation |
| `evaluation_goals` | [人事評価・OKR・360度] 評価シートの目標（MBO の KPI・ウェイト・期限） | 0 | 2 | 0 | features/evaluation |
| `evaluation_periods` | [人事評価・OKR・360度] 評価期間（年度・目標設定期限・各評価期限） | 0 | 7 | 0 | features/career-discussions, features/evaluation, features/hr-kpi, features/turnover-risk |
| `evaluation_reminders` | [人事評価・OKR・360度] 評価の督促（リマインド）送信履歴 | 0 | 5 | 0 | features/evaluation |
| `evaluation_scores` | [人事評価・OKR・360度] 評価項目・目標ごとの評価点（本人・一次・二次） | 0 | 5 | 0 | features/evaluation |
| `evaluation_sheets` | [人事評価・OKR・360度] 従業員ごとの評価シート（評価者・フロー状態・最終評価） | 0 | 20 | 0 | features/evaluation, features/hr-kpi, features/turnover-risk |
| `evaluation_template_items` | [人事評価・OKR・360度] 評価テンプレートの評価項目（軸・ウェイト・対象等級） | 0 | 6 | 0 | features/evaluation |
| `evaluation_templates` | [人事評価・OKR・360度] テナントの評価テンプレート（グローバルテンプレートからコピー可） | 0 | 6 | 0 | features/evaluation |
| `global_evaluation_template_items` | [人事評価・OKR・360度] SaaS 共通の評価テンプレート項目 | 22 | 5 | 0 | features/evaluation, features/global-evaluation-templates |
| `global_evaluation_templates` | SaaS管理者が管理するグローバル評価テンプレート。テナントはここからコピーしてカスタマイズする。 | 3 | 6 | 0 | features/evaluation, features/global-evaluation-templates |
| `grade_evaluation_criteria` | [人事評価・OKR・360度] 等級別・評価点別の評価基準文 [未使用候補 2026-09] | 0 | 0 | 0 |  |
| `key_results` | [人事評価・OKR・360度] OKR の主要な成果（Key Result。目標値・進捗） | 0 | 9 | 0 | features/okr |
| `objectives` | [人事評価・OKR・360度] OKR の目標（Objective。個人・部署、親子階層あり） | 0 | 10 | 0 | features/okr |
| `review_360_campaigns` | [人事評価・OKR・360度] 360度評価の実施キャンペーン | 0 | 9 | 0 | features/evaluation |
| `review_360_questions` | [人事評価・OKR・360度] 360度評価の設問 | 0 | 6 | 0 | features/evaluation |
| `review_360_responses` | [人事評価・OKR・360度] 360度評価の回答（設問別スコア・コメント） | 0 | 7 | 0 | features/evaluation |
| `review_360_reviewers` | [人事評価・OKR・360度] 360度評価の評価者（被評価者ごとの割り当て） | 0 | 8 | 0 | features/evaluation |
| `review_360_subjects` | [人事評価・OKR・360度] 360度評価の被評価者 | 0 | 6 | 0 | features/evaluation |

## スキル・資格・研修計画

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `employee_career_goals` | [スキル・資格・研修計画] 従業員のキャリア目標（目標スキル・時期・合意状況） | 0 | 6 | 0 | features/skill-map, features/skill-portal |
| `employee_qualifications` | 【MVP未使用 / 予約】従業員の資格保有情報。現状アプリから参照していない。将来の資格管理機能向けに保持（DROP禁止）。 | 0 | 4 | 0 | features/qualifications, functions/qualification-expiry-alert |
| `employee_recommended_courses` | [スキル・資格・研修計画] 上長等から従業員への推奨講座 | 0 | 3 | 0 | features/skill-portal |
| `employee_skill_assignments` | [スキル・資格・研修計画] 従業員へのスキル（役割）割り当て | 0 | 11 | 0 | features/hr-kpi, features/skill-map, features/skill-portal, features/turnover-risk |
| `employee_skill_level_achievements` | [スキル・資格・研修計画] 従業員のスキルレベル達成記録 | 0 | 1 | 0 | features/e-learning |
| `employee_skill_requirement_history` | [スキル・資格・研修計画] スキル要件の達成率の推移（スナップショット） | 0 | 4 | 0 | features/skill-map, features/skill-portal |
| `employee_skill_requirement_selections` | [スキル・資格・研修計画] 従業員が取り組む対象として選んだスキル要件 | 0 | 9 | 0 | features/e-learning, features/skill-map, features/skill-portal |
| `employee_skill_self_evaluations` | [スキル・資格・研修計画] スキル要件ごとの自己評価 | 0 | 3 | 0 | features/skill-map, features/skill-portal |
| `employee_training_plans` | [スキル・資格・研修計画] 従業員に割り当てた研修計画 | 0 | 4 | 0 | features/skill-map |
| `global_skill_level_sets` | スキルレベルのセット（評価軸）。職種に依存せず SaaS テンプレート全体で共有する。セット内に複数の global_skill_levels を持つ。 | 0 | 6 | 0 | features/global-skill-templates, features/skill-map |
| `global_skill_levels` | [スキル・資格・研修計画] SaaS 共通のスキルレベル定義 | 0 | 6 | 0 | features/global-skill-templates, features/skill-map |
| `qualifications` | 【MVP未使用 / 予約】資格マスタ。現状アプリから参照していない。将来の資格管理機能向けに保持（DROP禁止）。 | 0 | 4 | 0 | features/qualifications, functions/qualification-expiry-alert |
| `skill_consultations` | [スキル・資格・研修計画] スキル・キャリアに関する上長への相談と回答 | 0 | 5 | 0 | features/skill-portal |
| `skill_feedback_comments` | [スキル・資格・研修計画] スキル関連のフィードバックコメント | 0 | 8 | 0 | features/skill-portal |
| `skill_growth_milestones` | [スキル・資格・研修計画] 従業員の成長マイルストーン | 0 | 4 | 0 | features/skill-portal |
| `skill_levels` | [スキル・資格・研修計画] テナントのスキルレベル定義 | 0 | 18 | 0 | features/skill-map, features/skill-portal |
| `skill_map_drafts` | 【MVP未使用 / v1残存】スキルマップ下書き。現行UIから未接続。データ保持方針により残置（DROP禁止）。 | 0 | 3 | 0 | features/skill-map |
| `skill_requirement_applications` | [スキル・資格・研修計画] スキル要件の達成申請と承認（上長・人事） | 0 | 12 | 0 | features/skill-portal |
| `skill_requirements` | [スキル・資格・研修計画] スキルごとの要件（習得すべき項目とレベル） | 2 | 19 | 0 | features/e-learning, features/hr-kpi, features/skill-map, features/skill-portal, features/turnover-risk |
| `skill_role_applications` | [スキル・資格・研修計画] スキル（役割）取得の申請と承認（上長・人事） | 0 | 12 | 0 | features/skill-portal |
| `tenant_skill_level_sets` | テナント固有のスキルレベルセット（評価軸）。職種に依存せずテナント全体で共有する。 | 2 | 7 | 0 | features/skill-map |
| `tenant_skills` | [スキル・資格・研修計画] テナントのスキル（職種・役割）マスタ | 2 | 20 | 0 | features/e-learning, features/skill-map, features/skill-portal |
| `training_plan_template_courses` | [スキル・資格・研修計画] 研修計画テンプレートに含まれる講座 | 0 | 6 | 0 | features/skill-map |
| `training_plan_templates` | [スキル・資格・研修計画] 研修計画テンプレート（スキル別） | 1 | 7 | 0 | features/skill-map |

## eラーニング

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `el_assignments` | [eラーニング] 講座の受講割り当て（期限・修了日） | 30 | 21 | 0 | features/adm-dashboard, features/e-learning, features/hr-kpi, features/skill-map, features/turnover-risk, src/app/(tenant) |
| `el_checklist_completions` | 受講者が現場適用チェックリストの各項目を完了したことを記録する。コース完了後も随時追加可能。 | 0 | 3 | 0 | features/e-learning |
| `el_checklist_items` | 現場適用チェックリストの各項目。1スライドに3〜5件を推奨。 | 4 | 7 | 0 | features/e-learning |
| `el_course_requirement_mappings` | [eラーニング] 講座とスキル要件の対応表 | 2 | 7 | 0 | features/e-learning, features/skill-map, src/app/(tenant) |
| `el_course_skill_level_mappings` | [eラーニング] 講座とスキルレベルの対応表 | 0 | 4 | 0 | features/e-learning, features/skill-map |
| `el_courses` | [eラーニング] 講座マスタ（公開期間・形式・学習目標） | 7 | 26 | 0 | features/e-learning, features/skill-map, features/skill-portal |
| `el_learning_preferences` | [eラーニング] 受講者ごとの学習設定（音声・字幕） | 1 | 2 | 0 | features/e-learning |
| `el_progress` | [eラーニング] スライド単位の受講進捗・テスト結果 | 18 | 5 | 0 | features/e-learning |
| `el_quiz_options` | [eラーニング] 確認テストの選択肢 | 24 | 5 | 0 | features/e-learning |
| `el_quiz_questions` | [eラーニング] スライドに紐づく確認テストの設問 | 6 | 5 | 0 | features/e-learning |
| `el_scenario_branches` | シナリオスライドの分岐選択肢。1スライドに2〜4件程度を想定。 | 3 | 7 | 0 | features/e-learning |
| `el_scorm_packages` | [eラーニング] SCORM/xAPI パッケージの格納情報（講座単位） | 0 | 4 | 0 | features/e-learning |
| `el_scorm_runtime` | [eラーニング] SCORM 受講の実行時データ（cmi・中断データ） | 0 | 2 | 0 | features/e-learning |
| `el_slides` | [eラーニング] 講座のスライド（テキスト・画像・動画・音声） | 33 | 18 | 0 | features/e-learning, src/app/(tenant) |
| `el_xapi_statements` | [eラーニング] xAPI ステートメントの記録 | 0 | 3 | 0 | features/e-learning |

## 採用・リファラル

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `candidate_pulses` | [採用・リファラル] 候補者の選考体験パルス（懸念・感情スコア） | 7 | 6 | 0 | features/candidate-pulse |
| `candidates` | [採用・リファラル] 応募者（候補者）と選考ステージ | 0 | 12 | 0 | features/hr-kpi, features/job-postings |
| `job_posting_ai_variants` | [採用・リファラル] 求人票の AI 生成バリエーション（媒体別） | 0 | 3 | 1 | features/job-postings |
| `job_postings` | [採用・リファラル] 求人票 | 6 | 16 | 1 | features/hr-kpi, features/job-postings, src/app/api |
| `recruitment_jobs` | TalentDraft AI: 採用求人管理テーブル | 23 | 4 | 0 | features/recruitment-ai |
| `referral_nominations` | [採用・リファラル] 従業員からのリファラル推薦 | 1 | 10 | 0 | features/referral |
| `referral_postings` | [採用・リファラル] リファラル募集（報酬条件つき） | 1 | 8 | 0 | features/referral |
| `referral_rewards` | [採用・リファラル] リファラル報酬の承認・支払状況 | 1 | 5 | 0 | features/referral |

## 離職リスク・ライフサイクル

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `exit_interviews` | [離職リスク・ライフサイクル] 退職者インタビュー（退職理由など） | 0 | 5 | 0 | features/exit-interview |
| `lifecycle_instances` | [離職リスク・ライフサイクル] 入社・退職などのライフサイクル手続きの実施単位 | 4 | 6 | 0 | features/lifecycle |
| `lifecycle_task_templates` | [離職リスク・ライフサイクル] ライフサイクル手続きのタスクテンプレート | 0 | 6 | 0 | features/lifecycle |
| `lifecycle_tasks` | [離職リスク・ライフサイクル] ライフサイクル手続きの個別タスク | 0 | 6 | 0 | features/lifecycle |
| `turnover_risk_action_logs` | [離職リスク・ライフサイクル] 離職リスクへの対応記録 | 0 | 3 | 0 | features/turnover-risk |
| `turnover_risk_alerts` | [離職リスク・ライフサイクル] 離職リスク上昇アラートの通知履歴 | 0 | 2 | 0 | features/turnover-risk |
| `turnover_risk_scores` | [離職リスク・ライフサイクル] 従業員別の離職リスクスコア算出結果 | 0 | 4 | 0 | features/turnover-risk |

## 人員計画・後継者

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `project_simulations` | [人員計画・後継者] 人員配置シミュレーション | 0 | 5 | 0 | features/skill-map |
| `simulation_assigned_members` | [人員計画・後継者] ポジションへの配置メンバー | 0 | 3 | 0 | features/skill-map |
| `simulation_position_requirements` | [人員計画・後継者] ポジションに必要なスキル要件 | 0 | 3 | 0 | features/skill-map |
| `simulation_positions` | [人員計画・後継者] シミュレーション内のポジション | 0 | 3 | 0 | features/skill-map |
| `succession_candidates` | [人員計画・後継者] ポジションごとの後継者候補（準備度・評価） | 0 | 5 | 0 | features/succession-plan |
| `succession_positions` | [人員計画・後継者] 後継者計画の対象ポジション | 0 | 4 | 0 | features/succession-plan |

## 称賛・表彰・社内イベント

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `awards` | [称賛・表彰・社内イベント] 表彰の記録 | 0 | 3 | 0 | features/internal-events, features/recognition |
| `internal_event_attendees` | [称賛・表彰・社内イベント] 社内イベントの出欠 | 0 | 4 | 0 | features/hr-kpi, features/internal-events |
| `internal_events` | [称賛・表彰・社内イベント] 社内イベント | 0 | 6 | 0 | features/hr-kpi, features/internal-events |
| `kudos` | [称賛・表彰・社内イベント] 従業員間の称賛メッセージ | 0 | 8 | 1 | features/hr-kpi, features/recognition |
| `kudos_reactions` | [称賛・表彰・社内イベント] 称賛へのリアクション | 0 | 4 | 0 | features/recognition |
| `kudos_recipients` | [称賛・表彰・社内イベント] 称賛の受け手 | 0 | 6 | 1 | features/recognition |
| `kudos_value_tags` | [称賛・表彰・社内イベント] 称賛に付けるバリュータグのマスタ | 0 | 6 | 0 | features/recognition |

## タスク管理

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `task_assignees` | タスク管理: タスク1件に対する複数担当者の割当（多対多）。tasks.assignee_employee_id（単一）を置き換える | 12 | 12 | 3 | features/task-management |
| `task_comment_one_on_one_links` | タスクコメントと1on1（予定/実施済み）の紐付け。one_on_one_upcoming_id/one_on_one_session_id のどちらか一方のみが設定される | 0 | 0 | 0 |  |
| `task_comments` | タスク管理: タスクまたはタスクグループ単位のコメント（報告・助言・進言）。task_id/task_group_id のどちらか一方のみが設定される | 10 | 10 | 1 | features/task-management |
| `task_group_managers` | タスク管理: タスクグループのマネージャー割当（責任者のみ操作可） | 4 | 6 | 2 | features/task-management |
| `task_group_members` | タスク管理: タスクグループのメンバー割当（責任者・マネージャーが操作可） | 5 | 6 | 2 | features/task-management |
| `task_groups` | タスク管理: マイルストーン配下のタスクグループ | 2 | 9 | 2 | features/task-management |
| `task_milestones` | タスク管理: 目標配下のマイルストーン | 2 | 12 | 3 | features/task-management |
| `task_objectives` | タスク管理: 責任者が作成する目標 | 2 | 11 | 2 | features/task-management |
| `task_work_logs` | タスク管理: タスク単位の自由入力形式の工数記録（作業日・時間・メモ）。要求7に対応 | 5 | 11 | 0 | features/task-management, features/workload-analysis |
| `tasks` | タスク管理: タスクグループ配下の個別タスク | 5 | 28 | 6 | features/task-management |

## AI・法令・RAG

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `hr_law_chunks` | [AI・法令・RAG] 法令文書のチャンクと埋め込みベクトル | 10 | 4 | 2 | features/hr-assistant, functions/hr-law-refresh |
| `hr_law_crawl_queue` | [AI・法令・RAG] 法令情報のクロール待ち URL キュー | 36 | 13 | 0 | features/saas-law-knowledge, functions/hr-law-refresh |
| `hr_law_documents` | [AI・法令・RAG] 収集した法令・行政情報の文書 | 4 | 18 | 3 | features/hr-assistant, features/saas-law-knowledge, functions/hr-law-refresh |
| `hr_law_refresh_logs` | hr-law-refresh Edge Function の実施ログ（日時降順で表示） | 2 | 7 | 0 | features/saas-law-knowledge, functions/hr-law-refresh |
| `hr_law_sources` | [AI・法令・RAG] 法令情報の収集元（検索トピック・クエリ） | 8 | 17 | 0 | features/saas-law-knowledge, functions/hr-assistant-template-mining, functions/hr-law-refresh |
| `hr_law_topic_proposals` | 監視トピック候補。チャット需要・厚労省新着・SEOキー分析から提案し、SaaS管理者が承認して hr_law_sources へ反映する | 10 | 15 | 0 | features/saas-law-knowledge, functions/hr-assistant-template-mining, functions/hr-law-refresh |
| `tenant_hr_assistant_messages` | [AI・法令・RAG] AI 人事アシスタントの会話メッセージ | 18 | 5 | 0 | features/hr-assistant, functions/hr-assistant-template-mining |
| `tenant_hr_assistant_sessions` | [AI・法令・RAG] AI 人事アシスタントの会話セッション | 8 | 4 | 0 | features/hr-assistant |
| `tenant_hr_assistant_templates` | [AI・法令・RAG] AI 人事アシスタントの質問テンプレート | 20 | 2 | 1 | features/hr-assistant, functions/hr-assistant-template-mining |
| `tenant_inquiry_chat_messages` | [AI・法令・RAG] 社内問い合わせチャットの会話メッセージ | 4 | 4 | 0 | features/inquiry-chat |
| `tenant_inquiry_chat_sessions` | [AI・法令・RAG] 社内問い合わせチャットの会話セッション | 1 | 2 | 0 | features/inquiry-chat |
| `tenant_rag_audit_logs` | [AI・法令・RAG] テナント文書の操作履歴 | 1 | 1 | 0 | features/inquiry-chat |
| `tenant_rag_chunks` | [AI・法令・RAG] テナント文書のチャンクと埋め込みベクトル | 118 | 5 | 1 | features/inquiry-chat, scripts |
| `tenant_rag_documents` | [AI・法令・RAG] テナントがアップロードした社内規程等の文書 | 1 | 14 | 0 | features/inquiry-chat |
| `tenant_research_queries` | 「調べる」機能の検索履歴（検索条件のみ。原文は保存しない） | 49 | 3 | 0 | features/law-research |

## 助成金

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `grant_application_status` | 助成金の申請進捗管理（テナント固有） | 0 | 0 | 0 |  |
| `grant_batch_runs` | 助成金情報配信バッチの実行履歴。テナント横断で動く処理を含むため tenant_id を持たず、内訳は metadata に記録する | 3 | 5 | 0 | features/grant-notifier |
| `grant_deliveries` | 助成金情報の配信履歴。(tenant_id, grant_id) で送信済みを一意管理し重複送信を防ぐ | 9 | 6 | 0 | features/grant-notifier |
| `grant_llm_usage` | 助成金情報配信バッチの LLM 利用量・コスト | 32 | 2 | 0 | features/grant-notifier |
| `grant_match_results` | テナント条件×助成金の AI 適合判定。不適合を含め全件保存する | 32 | 7 | 0 | features/grant-notifier |
| `grant_sources` | 助成金の収集ソースマスタ（全テナント共有。収集は横断で1回のみ実施するため tenant_id を持たない） | 1 | 4 | 0 | features/grant-notifier |
| `grant_tenant_conditions` | 助成金情報配信のテナント別配信条件（テナントにつき1件） | 1 | 7 | 0 | features/grant-notifier, src/app/p |
| `grant_versions` | 助成金マスタ（横断）の変更記録。tenant_id を持たない理由も同じ | 0 | 1 | 0 | features/grant-notifier |
| `grants` | 助成金マスタ（全テナント共有。テナント別の適合判定は grant_match_results で表す） | 105 | 7 | 0 | features/grant-notifier |

## LINE連携

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `line_friend_invites` | 既存従業員向け LINE 友だち招待トークン | 1 | 5 | 0 | features/line, src/app/api, src/app/p |
| `line_friends` | LINE公式アカウントの友だちと従業員の紐付け（全テナント共用OA） | 0 | 9 | 0 | features/line, src/app/api |

## 書類・画像取込

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `captured_document_images` | 文書キャプチャの画像。role は front/back/page。storage_path は captured-documents バケット内のパス。 | 0 | 8 | 0 | features/documents |
| `captured_document_line_items` | 伝票明細行。主に invoice / purchase_order で使用。 | 0 | 4 | 0 | features/documents |
| `captured_documents` | 汎用文書キャプチャ。種類は document_type（プラグインが正）。division_id は投稿当時の所属部門を固定保存する。 | 0 | 14 | 0 | features/documents |
| `picture_send_subjects` | 画像送信で繰り返し使う件名マスタ。部門単位で共有し、マネージャーのみ編集できる。 | 0 | 5 | 0 | features/picture-report |
| `picture_sends` | 画像送信の記録。division_id は投稿当時の所属部門を固定で保存する（異動後もマネージャー閲覧範囲は投稿当時の部門で判定する）。 | 0 | 7 | 0 | features/picture-report |

## mYou（別製品）

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `myou_alert_logs` | [mYou（別製品）] 取引先へのアラート送信履歴 | 4 | 3 | 0 | features/myou |
| `myou_companies` | [mYou（別製品）] 取引先企業マスタ | 2 | 12 | 1 | features/myou |
| `myou_delivery_logs` | [mYou（別製品）] ロットの納品履歴（トレース番号・数量・期限） | 20 | 6 | 1 | features/myou |
| `myou_lots` | 製造ロット（段ボール単位）の在庫。lot_no＋quantity_remainingで在庫を管理する | 17 | 9 | 2 | features/myou |
| `myou_product_manuals` | 製品ラベル QR 向け取扱説明書（環境ごとに種別1件・テナント非依存。tenant_id は監査用） | 2 | 4 | 0 | features/myou |
| `myou_trace_labels` | トレーサビリティQRラベルの発行履歴（発行のたび1件記録し、当日通番の採番元になる） | 20 | 8 | 1 | features/myou |

## 未使用候補

アプリのコード（`.from()`）からも DB 関数からも参照されていないテーブル。**削除はしない**。棚卸しの判断材料として記録している。
FK で参照されているもの・マスタデータが入っているものがあるため、削除する場合は別タスクで本番件数を確認してから判断する。

| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |
|---|---|--:|--:|--:|---|
| `grade_evaluation_criteria` | [人事評価・OKR・360度] 等級別・評価点別の評価基準文 [未使用候補 2026-09] | 0 | 0 | 0 |  |
| `grant_application_status` | 助成金の申請進捗管理（テナント固有） | 0 | 0 | 0 |  |
| `health_assessments_link` | 健康評価（ストレスチェック等）との外部連携用リンク（テナント単位） | 0 | 0 | 0 |  |
| `interventions` | 産業医面談等の介入記録（テナント単位） | 0 | 0 | 0 |  |
| `overtime_analysis_results` | 36協定等との比較・分析結果（テナント単位・月1行） | 0 | 0 | 0 |  |
| `stress_check_high_stress_criteria` | [ストレスチェック・産業医] 高ストレス者の判定基準マスタ [未使用候補 2026-09] | 4 | 0 | 0 |  |
| `stress_check_response_options` | [ストレスチェック・産業医] 回答選択肢マスタ（尺度別の点数とラベル） [未使用候補 2026-09] | 16 | 0 | 0 |  |
| `stress_check_scale_conversions` | [ストレスチェック・産業医] 尺度の素点から5段階評価への換算表（性別別） [未使用候補 2026-09] | 38 | 0 | 0 |  |
| `task_comment_one_on_one_links` | タスクコメントと1on1（予定/実施済み）の紐付け。one_on_one_upcoming_id/one_on_one_session_id のどちらか一方のみが設定される | 0 | 0 | 0 |  |
| `telework_activity_stats` | 日次アクティビティ集計（テナント・ユーザー単位） | 0 | 0 | 0 |  |

-- ============================================================================
-- MISSING UPDATES FOR SERVICE TABLE
-- HR-DX SaaS Migration - June 26, 2026
--
-- This SQL contains all UPDATE statements that were missing from the original
-- migration: 20260626000000_update_service_titles_descriptions.sql
--
-- Total: 42 services requiring updates
-- ============================================================================

-- GROUP 1: COMPLETELY EMPTY (Need both title + description)
-- 7 services

UPDATE public.service SET
  title = '採用市場分析',
  description = '競合企業の採用状況や市場トレンドを分析し、採用戦略の最適化に活用します。'
WHERE name = '採用市場・競合分析';

UPDATE public.service SET
  title = '人事評価シート一括生成',
  description = '従業員の評価シートを一覧で表示・管理し、一括生成・編集が可能です。'
WHERE name = '人事評価シート一覧・一括生成';

UPDATE public.service SET
  title = 'スキル・レベルテンプレート',
  description = '従業員のスキルと能力レベルを定義するテンプレートを管理できます。'
WHERE name = '「スキル・レベル」テンプレート管理';

UPDATE public.service SET
  title = '労務コンプライアンスダッシュボード',
  description = '労務管理における法令遵守状況をダッシュボードで可視化・管理します。'
WHERE name = '「労務コンプライアンス」ダッシュボード';

UPDATE public.service SET
  title = '採用プロセスダッシュボード',
  description = '採用プロセスの進捗状況をダッシュボード形式で一元管理できます。'
WHERE name = '「採用プロセス」ダッシュボード';

UPDATE public.service SET
  title = '研修コーステンプレート',
  description = 'eラーニング向けの研修コーステンプレートを作成・管理できます。'
WHERE name = '「研修コース」テンプレート 作成';

UPDATE public.service SET
  title = '統合エンゲージメントダッシュボード',
  description = '複数の施策からのエンゲージメント指標を統合的に分析・表示します。'
WHERE name = '「統合エンゲージメント」ダッシュボード';

-- ============================================================================
-- GROUP 2: ENGLISH DESCRIPTIONS (Need translation to Japanese)
-- 9 services - Replace English descriptions with Japanese equivalents
-- ============================================================================

UPDATE public.service SET
  description = '毎年実施が義務付けられているストレスチェック検査に回答します。'
WHERE name = 'ストレスチェック';

UPDATE public.service SET
  description = 'ストレスチェック結果とEchoパルスサーベイの結果を組み合わせて分析します。'
WHERE name = 'ストレスチェック × Echo クロス分析';

UPDATE public.service SET
  description = 'ストレスチェック実施時の回答進捗状況をモニタリングし、リマインダーを送信します。'
WHERE name = 'ストレスチェック進捗管理';

UPDATE public.service SET
  description = '労基署への報告に必要なデータを自動集計し、レポート形式で出力します。'
WHERE name = '労基署報告用データ集計';

UPDATE public.service SET
  description = '採用市場のトレンドや競合企業の採用動向を分析して採用戦略に活用します。'
WHERE name = '採用市場・競合分析ダッシュボード';

UPDATE public.service SET
  description = '貴社の組織構成や部門、階層を登録し、組織管理の基盤を構築します。'
WHERE name = '組織の登録';

UPDATE public.service SET
  description = '組織全体のストレスレベルをヒートマップで可視化し、部門別に比較分析できます。'
WHERE name = '組織健康度分析（ヒートマップ）';

UPDATE public.service SET
  description = '今月の組織健康度を短時間のアンケート調査で把握し、組織の状態を監視します。'
WHERE name = '今月の組織健康度アンケート';

UPDATE public.service SET
  description = '従業員データをCSVファイルやシステムから読み込み、一括登録・管理します。'
WHERE name = '従業員の登録';

-- ============================================================================
-- GROUP 3: EMPTY DESCRIPTIONS (Have title, need description)
-- 26 services - Add Japanese descriptions
-- ============================================================================

UPDATE public.service SET
  description = 'マネージャーと従業員が1on1面談を実施し、目標設定や業務改善を支援します。'
WHERE name = '1on1支援機能';

UPDATE public.service SET
  description = '360度評価のキャンペーンを計画・実施し、従業員の評価を一元管理します。'
WHERE name = '360度評価キャンペーン管理';

UPDATE public.service SET
  description = '36協定で定める時間外労働の上限条件を分析し、法令遵守をサポートします。'
WHERE name = '36協定分析・残業集計';

UPDATE public.service SET
  description = '組織全体の情報や施策の進捗状況をダッシュボード形式で表示します。'
WHERE name = 'ダッシュボード';

UPDATE public.service SET
  description = '従業員が直接知人を推薦し、推薦件数ランキングで社内のモチベーションを高めます。'
WHERE name = 'リファラル採用：マイ推薦一覧・ランキング';

UPDATE public.service SET
  description = '推薦対象の求人を一覧表示し、従業員が知人を推薦できるフォームです。'
WHERE name = 'リファラル採用：求人一覧・推薦フォーム';

UPDATE public.service SET
  description = 'ストレスや心理的悩みに関する相談を上司に申告する専用フォームです。'
WHERE name = '上司への相談（SOS）フォーム';

UPDATE public.service SET
  description = '上長が従業員からの各種申請を確認し、承認または却下する画面です。'
WHERE name = '上長が承認・却下';

UPDATE public.service SET
  description = '人事の最終承認後、従業員のスキルマップに自動的に反映させます。'
WHERE name = '人事が最終承認 → スキルマップへ自動反映';

UPDATE public.service SET
  description = '複数の人事評価テンプレートを一覧表示し、選択・適用できます。'
WHERE name = '人事評価テンプレート一覧';

UPDATE public.service SET
  description = '人事評価用のテンプレートを作成・編集・削除して、評価基準を管理します。'
WHERE name = '人事評価テンプレート管理';

UPDATE public.service SET
  description = '入社から退社までのライフサイクルを通じた業務フローを設定・管理します。'
WHERE name = '入退社ライフサイクルワークフロー';

UPDATE public.service SET
  description = 'eラーニング研修の受講者を登録し、進捗を管理します。'
WHERE name = '受講者の登録';

UPDATE public.service SET
  description = '従業員が自身のスキルと能力レベルを申請し、スキルマップを構築します。'
WHERE name = '従業員が「スキル・能力」を申請';

UPDATE public.service SET
  description = '従業員に対して職種を割り当て、キャリアパスを設定します。'
WHERE name = '従業員へ「職種」を割り当てる';

UPDATE public.service SET
  description = '各種申請の承認者となるマスタデータを管理します。'
WHERE name = '承認者マスタ管理';

UPDATE public.service SET
  description = '採用パイプラインの各段階における候補者数やコンバージョン率を分析します。'
WHERE name = '採用ファネルダッシュボード';

UPDATE public.service SET
  description = '求人票を複数の媒体に登録し、各媒体での掲載状況を一元管理します。'
WHERE name = '求人票管理・媒体連携';

UPDATE public.service SET
  description = 'OKRやMBO目標を設定・管理し、従業員のパフォーマンス達成を支援します。'
WHERE name = '目標管理（OKR / MBO）機能';

UPDATE public.service SET
  description = 'オンライン研修（eラーニング）プラットフォームにアクセスし、講座を受講できます。'
WHERE name = '研修（eラーニング）';

UPDATE public.service SET
  description = '新規の研修コースを作成し、eラーニングシステムで運用管理します。'
WHERE name = '研修コース作成';

UPDATE public.service SET
  description = '従業員の職種とスキルレベルを管理し、組織のスキルマップを構築・運用します。'
WHERE name = '職種・スキル・レベルの管理';

UPDATE public.service SET
  description = '従業員が自身のキャリア開発の進捗をボードで可視化・管理できます。'
WHERE name = '自分の育成ジャーニーボード';

UPDATE public.service SET
  description = '従業員が自己評価を入力し、360度評価からのフィードバックを受け取ります。'
WHERE name = '自己評価・360度評価回答';

UPDATE public.service SET
  description = '人事評価の実施期間や承認プロセスを管理し、評価ワークフローを運用します。'
WHERE name = '評価ワークフロー管理';

UPDATE public.service SET
  description = '人事評価の実施期間を設定し、期間ごとのステータスを管理します。'
WHERE name = '評価期間の作成・ステータス管理';

-- ============================================================================
-- END OF MISSING UPDATES
-- ============================================================================
-- Total services updated: 42
-- Expected total after apply: 114 services all with proper titles + descriptions
-- ============================================================================

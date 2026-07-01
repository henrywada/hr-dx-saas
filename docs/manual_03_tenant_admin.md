# HR-DX SaaS 操作マニュアル ── ③ テナント管理者向け

**対象ユーザー：** hr / hr_manager / tenant_admin / manager / company_doctor / company_nurse  
**アクセス範囲：** src/app/(tenant)/(tenant-admin)/adm/  
**バージョン：** 0.1（初稿）  
**最終更新：** 2026-07-01

---

## 目次

### 基本設定
1. [従業員管理](#1-従業員管理)
2. [部署管理](#2-部署管理)
3. [お知らせ管理](#3-お知らせ管理)
4. [基本設定・ポータル設定](#4-基本設定ポータル設定)
5. [サービス割当](#5-サービス割当)

### ウェルビーイング・健康管理
6. [ストレスチェック管理](#6-ストレスチェック管理)
7. [コンディショントレンド](#7-コンディショントレンド)
8. [高ストレス者対応](#8-高ストレス者対応)
9. [パルス×ストレス分析](#9-パルスストレス分析)
10. [相談窓口（受付・管理）](#10-相談窓口受付管理)

### エンゲージメント
11. [社内イベント・表彰管理](#11-社内イベント表彰管理)
12. [感謝称賛（Kudos）統計](#12-感謝称賛kudos統計)
13. [エンゲージメント分析](#13-エンゲージメント分析)
14. [アンケート・サーベイ管理](#14-アンケートサーベイ管理)

### タレントマネジメント
15. [人事評価管理](#15-人事評価管理)
16. [360度評価管理](#16-360度評価管理)
17. [1on1 管理](#17-1on1-管理)
18. [キャリア面談管理](#18-キャリア面談管理)
19. [OKR 管理](#19-okr-管理)
20. [スキルマップ管理](#20-スキルマップ管理)
21. [後継者計画（サクセッション）](#21-後継者計画サクセッション)
22. [離職リスク分析](#22-離職リスク分析)
23. [ライフサイクル管理](#23-ライフサイクル管理)
24. [退職面談管理](#24-退職面談管理)

### 採用
25. [求人・採用管理](#25-求人採用管理)
26. [リファラル採用管理](#26-リファラル採用管理)
27. [AI採用アシスト](#27-ai採用アシスト)

### 研修
28. [eラーニング管理](#28-eラーニング管理)

### 勤怠・労務
29. [勤怠ダッシュボード](#29-勤怠ダッシュボード)
30. [QR勤怠管理](#30-qr勤怠管理)
31. [残業36協定分析](#31-残業36協定分析)
32. [月次勤怠締め処理](#32-月次勤怠締め処理)
33. [労働法令コンプライアンス](#33-労働法令コンプライアンス)
34. [行政報告書出力](#34-行政報告書出力)

### AI・分析
35. [HRアシスタント（AI）](#35-hrアシスタントai)
36. [AI職場改善提案](#36-ai職場改善提案)
37. [HR KPI ダッシュボード](#37-hr-kpi-ダッシュボード)
38. [自動配信設定](#38-自動配信設定)

---

## ルート構成

| カテゴリ | URL パス |
|---|---|
| 従業員管理 | /adm/employees |
| 部署管理 | /adm/divisions |
| お知らせ | /adm/announcements |
| 設定 | /adm/settings |
| サービス割当 | /adm/service-assignments |
| ストレスチェック管理 | /adm/stress-check |
| ストレスチェック進捗 | /adm/stress-check/progress |
| グループ分析 | /adm/stress-check/group-analysis |
| 実施設定 | /adm/stress-check/mnt_sets |
| コンディション傾向 | /adm/condition-trend |
| 高ストレス者 | /adm/high-stress |
| 高ストレスフォローアップ | /adm/high-stress-followup |
| パルス×ストレス | /adm/pulse-stress |
| 相談窓口キュー | /adm/consultation-queue |
| イベント・表彰 | /adm/events-awards |
| Kudos統計 | /adm/kudos-stats |
| エンゲージメント | /adm/engagement |
| アンケート管理 | /adm/Survey |
| パルスアンケート | /adm/tenant_questionnaire |
| 評価管理 | /adm/evaluation |
| 360度評価 | /adm/evaluation-360 |
| 評価期間管理 | /adm/evaluation-periods |
| 評価テンプレート | /adm/evaluation-templates |
| 1on1 | /adm/one-on-one |
| キャリア面談 | /adm/career-discussions |
| OKR | /adm/okr |
| スキルマップ | /adm/skill-map |
| 後継者計画 | /adm/succession |
| 離職リスク | /adm/turnover-risk |
| ライフサイクル | /adm/lifecycle |
| 退職面談 | /adm/exit-interview |
| 求人管理 | /adm/job-positions |
| リファラル管理 | /adm/referral |
| AI採用 | /adm/recruitment-ai |
| eラーニング | /adm/el-courses / /adm/el-assignments |
| 勤怠ダッシュボード | /adm/attendance/dashboard |
| QR勤怠 | /adm/qr_atendance |
| 36協定分析 | /adm/36analysis |
| 月次締め | /adm/closure |
| 労働法令 | /adm/labor-compliance |
| 行政報告 | /adm/gov-report |
| HRアシスタント | /adm/hr-assistant |
| AI職場改善 | /adm/ai-workplace-improvement |
| 相談チャット知識 | /adm/inquiry-chat-knowledge |
| HR KPI | /adm/hr-kpi |
| 自動配信 | /adm/auto-distribution |
| 操作マニュアル | /adm/manual |

---

## 1. 従業員管理

### 従業員一覧・検索

1. 管理メニューから **「従業員管理」** を選択します（/adm/employees）。

   ![従業員一覧](./images/adm_01_employees.png)

2. 氏名・部署・ステータスで絞り込み検索ができます。

### 従業員の追加

1. **「新規追加」** ボタンをクリックします。
2. 社員番号・氏名・メールアドレス・部署・ロールを入力します。
3. **「保存」** をクリックすると招待メールが送信されます。

### 従業員の編集・無効化

1. 従業員一覧から対象者をクリックします。
2. 情報を編集し **「保存」** をクリックします。
3. 在籍終了の場合は ctive_status を「退職」に変更します。

### CSV一括インポート

1. **「CSVインポート」** をクリックします。
2. テンプレートCSVをダウンロードして情報を入力します。
3. 完成したCSVをアップロードして **「インポート」** をクリックします。

---

## 2. 部署管理

1. 管理メニューから **「部署管理」** を選択します（/adm/divisions）。

   ![部署管理](./images/adm_02_divisions.png)

2. **「新規追加」** で部署名を入力して保存します。
3. ドラッグ＆ドロップで部署の並び順を変更できます。

---

## 3. お知らせ管理

1. 管理メニューから **「お知らせ管理」** を選択します（/adm/announcements）。

   ![お知らせ管理](./images/adm_03_announcements.png)

2. **「新規作成」** をクリックします。
3. タイトル・本文・配信対象（全員 / 特定部署 / 特定個人）・公開日時を設定します。
4. **「保存」** をクリックすると指定日時に従業員のトップ画面に表示されます。

> **ポイント：** 個人宛指定で ecipient_employee_id を設定すると、その従業員のみに表示されます。

---

## 4. 基本設定・ポータル設定

1. 管理メニューから **「設定」** を選択します（/adm/settings）。

   ![基本設定](./images/adm_04_settings.png)

2. 設定できる主な項目：

| 項目 | 説明 |
|---|---|
| **人事問い合わせ先メール** | ポータルの「人事へのお問い合わせ」の宛先 |
| **会社プロフィール** | 会社名・事業内容・理念・社風（採用ブランディングに使用） |
| **QR打刻設定** | 打刻場所・許可時間帯の設定 |

---

## 5. サービス割当

1. 管理メニューから **「サービス割当」** を選択します（/adm/service-assignments）。
2. テナントが契約しているサービス（機能モジュール）の有効・無効を管理します。
3. 部署または個人単位での割当設定が可能です。

---

## 6. ストレスチェック管理

### 実施期間の設定

1. /adm/stress-check/mnt_sets で新しい実施期間を作成します。

   ![ストレスチェック設定](./images/adm_05_stress_mnt.png)

2. 期間名・開始日・終了日・対象部署を設定します。

### 回答進捗の確認

1. /adm/stress-check/progress で従業員の回答状況を確認します。

   ![進捗確認](./images/adm_06_stress_progress.png)

2. 未回答者へのリマインド送信ができます。

### グループ分析

1. /adm/stress-check/group-analysis で部署別・職位別の集計結果を確認します。

   ![グループ分析](./images/adm_07_stress_group.png)

---

## 7. コンディショントレンド

1. /adm/condition-trend で全従業員のコンディション推移をグラフで確認します。

   ![コンディショントレンド](./images/adm_08_condition_trend.png)

2. 低スコアが続く従業員にフィルタリングして個別対応の要否を判断します。

---

## 8. 高ストレス者対応

### 高ストレス者一覧

1. /adm/high-stress でストレスチェックで高ストレス判定になった従業員一覧を確認します。

   ![高ストレス者](./images/adm_09_high_stress.png)

### フォローアップ管理

1. /adm/high-stress-followup で産業医面談の申込・実施状況を管理します。

   ![フォローアップ](./images/adm_10_stress_followup.png)

2. 面談記録・同意状況を記録します。

> **注意：** 個人の健康情報は RLS（行レベルセキュリティ）で保護されており、権限のないユーザーは閲覧できません。

---

## 9. パルス×ストレス分析

1. /adm/pulse-stress でパルスサーベイの結果とストレスチェック結果を統合的に分析します。

   ![パルスストレス](./images/adm_11_pulse_stress.png)

---

## 10. 相談窓口（受付・管理）

1. /adm/consultation-queue で従業員からの相談を受信・返信します。

   ![相談キュー](./images/adm_12_consultation_queue.png)

2. 相談の割当・ステータス管理・返信が行えます。
3. 個別の相談詳細は /adm/consultation-queue/[id] で確認します。

---

## 11. 社内イベント・表彰管理

1. /adm/events-awards でイベントを作成・編集します。

   ![イベント管理](./images/adm_13_events.png)

2. **「新規イベント作成」** をクリックし、タイトル・日時・場所・対象者を設定します。
3. 表彰（Award）の作成も同画面から行えます。

---

## 12. 感謝称賛（Kudos）統計

1. /adm/kudos-stats で送受信数・バリュータグ別の統計を確認します。

   ![Kudos統計](./images/adm_14_kudos_stats.png)

---

## 13. エンゲージメント分析

1. /adm/engagement でエンゲージメントスコアの推移・部署別比較を確認します。

   ![エンゲージメント](./images/adm_15_engagement.png)

---

## 14. アンケート・サーベイ管理

### アンケート作成

1. /adm/Survey でアンケートを作成します。

   ![アンケート管理](./images/adm_16_survey.png)

2. **「新規作成」** → 質問の追加（テキスト・選択・評点など）。
3. 配信対象・配信期間を設定して **「配信開始」** をクリックします。

### 結果の確認

- /adm/Survey/[id] で回答集計・グラフを確認します。
- /adm/survey/dashboard でサーベイ全体の概況を確認します。

### パルスアンケート

- /adm/tenant_questionnaire で定期的に自動配信されるパルスアンケートの設定・結果を管理します。

---

## 15. 人事評価管理

### 評価期間の設定

1. /adm/evaluation-periods で評価期間を作成します（上期・下期など）。

   ![評価期間](./images/adm_17_eval_periods.png)

### 評価テンプレートの管理

1. /adm/evaluation-templates でテンプレート（評価項目・重み）を管理します。
2. グローバルテンプレートからコピーして自社用にカスタマイズできます。

### 評価シートの管理

1. /adm/evaluation で全従業員の評価シート一覧・進捗を確認します。

   ![評価管理](./images/adm_18_evaluation.png)

2. 評価フロー（自己評価→一次評価→二次評価→確認者）の進捗を管理します。
3. /adm/evaluation/workflow でフローの設定・変更ができます。

---

## 16. 360度評価管理

1. /adm/evaluation-360 で360度評価の設定・実施・結果を管理します。

---

## 17. 1on1 管理

1. /adm/one-on-one でマネージャーによる1on1面談の実施状況・記録を確認します。

   ![1on1管理](./images/adm_19_one_on_one.png)

2. セッション記録（テーマ・メモ・次回予定）が部署・期間別に確認できます。

---

## 18. キャリア面談管理

1. /adm/career-discussions でキャリア面談の実施状況・記録を一覧管理します。

   ![キャリア面談管理](./images/adm_20_career.png)

---

## 19. OKR 管理

### 目標の作成

1. /adm/okr で会社・部門・個人の目標（Objective）を作成します。

   ![OKRダッシュボード](./images/adm_21_okr.png)

2. **「目標を追加」** → オーナー種別（会社/部門/個人）・期間・タイトルを設定します。

### Key Result の管理

1. 目標を選択し **「KR を追加」** をクリックします。
2. KR タイプ（定量/定性）・目標値・単位・重みを設定します。

### 目標ツリーの確認

- /adm/okr/tree で目標の親子関係を可視化したツリービューを確認できます。

---

## 20. スキルマップ管理

1. /adm/skill-map で従業員のスキル状況を一覧で確認します。

   ![スキルマップ](./images/adm_22_skill_map.png)

2. スキルテンプレートのコピー・カスタマイズ（/adm/skill-tempCopy）ができます。
3. スキル申請の承認（/adm/skill-map/applications）・承認者設定（/adm/skill-map/approvers）を管理します。

---

## 21. 後継者計画（サクセッション）

1. /adm/succession で重要ポジションの後継者候補を管理します。

   ![後継者計画](./images/adm_23_succession.png)

---

## 22. 離職リスク分析

1. /adm/turnover-risk でAIが分析した離職リスクスコアを確認します。

   ![離職リスク](./images/adm_24_turnover_risk.png)

2. リスクの高い従業員に対してアクション（面談設定など）を記録できます。

---

## 23. ライフサイクル管理

1. /adm/lifecycle で採用〜退職までの従業員のライフサイクルイベントを管理します。

---

## 24. 退職面談管理

1. /adm/exit-interview で退職者へのインタビュー記録を管理します。

   ![退職面談](./images/adm_25_exit_interview.png)

---

## 25. 求人・採用管理

### 求人の作成・管理

1. /adm/job-positions で求人票を作成・管理します。

   ![求人管理](./images/adm_26_job_positions.png)

### 求人ブランディング

1. /adm/job-branding で求人ページのビジュアル・会社紹介文を設定します。

### 採用ファネル

1. /adm/funnel で応募〜内定までの各ステージの進捗を確認します。

### ハローワーク連携

1. /adm/hellowork でハローワークへの求人情報の連携管理を行います。

### 市場分析

1. /adm/market-analysis で競合他社の求人状況・市場給与水準を分析します。

### 内定バリデーション

1. /adm/offer-validation で内定者の情報・承諾状況を管理します。

---

## 26. リファラル採用管理

1. /adm/referral で従業員から紹介された候補者を一覧・管理します。

   ![リファラル管理](./images/adm_27_referral.png)

2. 個別の選考状況は /adm/referral/[id] で確認します。
3. 報奨金の設定は /adm/referral/rewards で行います。
4. 求人の掲載設定は /adm/referral/postings で行います。

---

## 27. AI採用アシスト

### AI採用スクリーニング

1. /adm/recruitment-ai でAIを使った書類選考・候補者評価を行います。

   ![AI採用](./images/adm_28_recruitment_ai.png)

### AIログの確認

1. /adm/recruitment-ai-log でAI評価のログを確認します。

### 候補者パルス

1. /adm/pulse で候補者に対するパルスアンケートを管理します。

---

## 28. eラーニング管理

### コース管理

1. /adm/el-courses でコース一覧を確認・編集します。

   ![eラーニング管理](./images/adm_29_el_courses.png)

2. **「新規コース作成」** → タイトル・カテゴリ・学習目標・スライドを設定します。
3. AIによるコース自動生成機能を使用することもできます（資料をアップロード）。

### 受講割当管理

1. /adm/el-assignments で従業員へのコース割当・受講期間を管理します。

   ![受講割当](./images/adm_30_el_assignments.png)

---

## 29. 勤怠ダッシュボード

1. /adm/attendance/dashboard で全従業員の出勤状況・残業時間・アラートを確認します。

   ![勤怠ダッシュボード](./images/adm_31_attendance_dashboard.png)

---

## 30. QR勤怠管理

1. /adm/qr_atendance でQR打刻の打刻記録・異常打刻を管理します。

   ![QR管理](./images/adm_32_qr_attendance.png)

2. 残業時間設定は /adm/overtime-settings で行います。

---

## 31. 残業36協定分析

1. /adm/36analysis で36協定の上限時間に対する残業状況を分析します。

   ![36協定](./images/adm_33_36analysis.png)

2. 上限超えリスクのある従業員に対してアラートが表示されます。

---

## 32. 月次勤怠締め処理

1. /adm/closure で月次の勤怠データを締めます。

   ![月次締め](./images/adm_34_closure.png)

2. 締め対象月を選択し **「集計実行」** → 内容確認後 **「締め確定」** をクリックします。
3. タイムカード修正は /adm/closure/[closure_id]/timecard で行います。

> **注意：** 締め確定後はデータの変更ができません。再オープンは管理者権限が必要です。

---

## 33. 労働法令コンプライアンス

1. /adm/labor-compliance で法定労働時間・休日・割増賃金に関する遵守状況を確認します。

   ![労働法令](./images/adm_35_labor_compliance.png)

---

## 34. 行政報告書出力

1. /adm/gov-report でストレスチェック等の行政提出用レポートを出力します。

   ![行政報告](./images/adm_36_gov_report.png)

2. 対象期間・形式（PDF/Excel）を選択してダウンロードします。

---

## 35. HRアシスタント（AI）

1. /adm/hr-assistant でAIアシスタントにHR業務の質問・相談ができます。

   ![HRアシスタント](./images/adm_37_hr_assistant.png)

2. 就業規則・規定文書をRAGナレッジとして登録しておくと回答精度が向上します。

---

## 36. AI職場改善提案

1. /adm/ai-workplace-improvement でサーベイ・ストレスチェックのデータをもとにAIが職場改善施策を提案します。

   ![AI改善提案](./images/adm_38_ai_improvement.png)

2. 提案内容を確認し、実施したアクションを記録します。

---

## 37. HR KPI ダッシュボード

1. /adm/hr-kpi で採用・離職率・エンゲージメント・勤怠などのKPIを一元確認します。

   ![HR KPI](./images/adm_39_hr_kpi.png)

---

## 38. 自動配信設定

1. /adm/auto-distribution でアンケートやお知らせの自動配信ルールを設定します。

   ![自動配信](./images/adm_40_auto_dist.png)

2. トリガー条件（特定日・定期）・配信対象・コンテンツを設定して保存します。

---

## よくあるエラーと対処法

| メッセージ | 原因 | 対処 |
|---|---|---|
| 「権限がありません」 | ロール不足 | テナント管理者権限の付与を上位管理者に依頼 |
| 「従業員情報が見つかりません」 | 対象従業員が未登録 | 従業員管理から先に登録 |
| CSVインポートが失敗する | フォーマット不一致 | テンプレートCSVを再ダウンロードして使用 |
| 月次締めが実行できない | 未集計データあり | 先に「集計実行」を行ってから「締め確定」 |
| 「メール送信に失敗しました」 | メール設定未完了 | 設定画面でメールアドレスを確認 |

---

## ページコンポーネント一覧

本マニュアル対象のページコンポーネントと実際のURLパスの対応表です。  
Next.jsのルートグループ（括弧付きディレクトリ）はURLに含まれません。

| 処理名称 | コンポーネントファイル | URLパス（実際のアクセスURL） |
|---|---|---|
| 管理ダッシュボード | dm/page.tsx | /adm |
| 管理サブメニュー | dm/subMenu/page.tsx | /adm/subMenu |
| **── 基本設定 ──** | | |
| 従業員管理 | dm/(base_mnt)/employees/page.tsx | /adm/employees |
| 部署管理 | dm/(base_mnt)/divisions/page.tsx | /adm/divisions |
| お知らせ管理 | dm/(base_mnt)/announcements/page.tsx | /adm/announcements |
| 基本設定・ポータル設定 | dm/(base_mnt)/settings/page.tsx | /adm/settings |
| サービス割当一覧 | dm/service-assignments/page.tsx | /adm/service-assignments |
| サービス割当詳細 | dm/service-assignments/[id]/page.tsx | /adm/service-assignments/[id] |
| サービスロール管理 | dm/service_role/page.tsx | /adm/service_role |
| **── ウェルビーイング・健康 ──** | | |
| ストレスチェック管理 | dm/(org_health)/stress-check/progress/page.tsx | /adm/stress-check/progress |
| ストレスチェック実施設定 | dm/(org_health)/stress-check/mnt_sets/page.tsx | /adm/stress-check/mnt_sets |
| ストレスチェックグループ分析 | dm/(org_health)/stress-check/group-analysis/page.tsx | /adm/stress-check/group-analysis |
| コンディショントレンド | dm/(org_health)/condition-trend/page.tsx | /adm/condition-trend |
| 高ストレス者一覧 | dm/(org_health)/high-stress/page.tsx | /adm/high-stress |
| 高ストレスフォローアップ一覧 | dm/(company_doctor)/high-stress-followup/page.tsx | /adm/high-stress-followup |
| 高ストレスフォローアップ詳細 | dm/(company_doctor)/high-stress-followup/[id]/page.tsx | /adm/high-stress-followup/[id] |
| パルス×ストレス分析 | dm/(org_health)/pulse-stress/page.tsx | /adm/pulse-stress |
| 事業場別分析 | dm/(org_health)/establishments/page.tsx | /adm/establishments |
| 行政報告書出力 | dm/(org_health)/gov-report/page.tsx | /adm/gov-report |
| 相談窓口キュー | dm/(consultation)/consultation-queue/page.tsx | /adm/consultation-queue |
| 相談詳細 | dm/(consultation)/consultation-queue/[id]/page.tsx | /adm/consultation-queue/[id] |
| **── エンゲージメント ──** | | |
| エンゲージメント分析 | dm/(engagement)/engagement/page.tsx | /adm/engagement |
| 社内イベント・表彰管理 | dm/(engagement)/events-awards/page.tsx | /adm/events-awards |
| Kudos統計 | dm/(engagement)/kudos-stats/page.tsx | /adm/kudos-stats |
| アンケート管理 | dm/(questionnaire)/Survey/page.tsx | /adm/Survey |
| アンケート期間管理 | dm/(questionnaire)/Survey/[id]/periods/page.tsx | /adm/Survey/[id]/periods |
| パルスアンケート管理 | dm/(puls)/tenant_questionnaire/page.tsx | /adm/tenant_questionnaire |
| サーベイダッシュボード | dm/(org_health)/survey/dashboard/page.tsx | /adm/survey/dashboard |
| **── タレントマネジメント ──** | | |
| 人事評価管理 | dm/(evaluation)/evaluation/page.tsx | /adm/evaluation |
| 評価シート詳細 | dm/(evaluation)/evaluation/[sheetId]/page.tsx | /adm/evaluation/[sheetId] |
| 評価ワークフロー設定 | dm/(evaluation)/evaluation/workflow/page.tsx | /adm/evaluation/workflow |
| 360度評価管理 | dm/(evaluation)/evaluation-360/page.tsx | /adm/evaluation-360 |
| 評価期間管理 | dm/(evaluation)/evaluation-periods/page.tsx | /adm/evaluation-periods |
| 評価テンプレート一覧 | dm/(evaluation)/evaluation-templates/page.tsx | /adm/evaluation-templates |
| 評価テンプレート詳細 | dm/(evaluation)/evaluation-templates/[templateId]/page.tsx | /adm/evaluation-templates/[templateId] |
| 1on1 管理 | dm/(one_on_one)/one-on-one/page.tsx | /adm/one-on-one |
| キャリア面談管理 | dm/(career)/career-discussions/page.tsx | /adm/career-discussions |
| OKRダッシュボード | dm/(okr)/okr/page.tsx | /adm/okr |
| OKR目標詳細 | dm/(okr)/okr/[objectiveId]/page.tsx | /adm/okr/[objectiveId] |
| OKRツリービュー | dm/(okr)/okr/tree/page.tsx | /adm/okr/tree |
| スキルマップ管理 | dm/(skill_map)/skill-map/page.tsx | /adm/skill-map |
| スキル申請管理 | dm/(skill_map)/skill-map/applications/page.tsx | /adm/skill-map/applications |
| スキル承認者設定 | dm/(skill_map)/skill-map/approvers/page.tsx | /adm/skill-map/approvers |
| スキルテンプレートコピー | dm/(skill_map)/skill-tempCopy/page.tsx | /adm/skill-tempCopy |
| 後継者計画 | dm/(succession)/succession/page.tsx | /adm/succession |
| 離職リスク分析 | dm/(turnover_risk)/turnover-risk/page.tsx | /adm/turnover-risk |
| ライフサイクル管理 | dm/(lifecycle)/lifecycle/page.tsx | /adm/lifecycle |
| 退職面談管理 | dm/(exit_interview)/exit-interview/page.tsx | /adm/exit-interview |
| **── 採用 ──** | | |
| 求人管理一覧 | dm/(recurit)/job-positions/page.tsx | /adm/job-positions |
| 求人詳細 | dm/(recurit)/job-positions/[id]/page.tsx | /adm/job-positions/[id] |
| 求人連携設定 | dm/(recurit)/job-positions/integration/page.tsx | /adm/job-positions/integration |
| 求人ブランディング | dm/(recurit)/job-branding/page.tsx | /adm/job-branding |
| 採用ファネル | dm/(recurit)/funnel/page.tsx | /adm/funnel |
| ハローワーク連携 | dm/(recurit)/hellowork/page.tsx | /adm/hellowork |
| 市場分析 | dm/(recurit)/market-analysis/page.tsx | /adm/market-analysis |
| 内定バリデーション | dm/(recurit)/offer-validation/page.tsx | /adm/offer-validation |
| 候補者パルス管理 | dm/(recurit)/pulse/page.tsx | /adm/pulse |
| AI採用スクリーニング | dm/(recurit)/recruitment-ai/page.tsx | /adm/recruitment-ai |
| AI採用ログ | dm/(recurit)/recruitment-ai-log/page.tsx | /adm/recruitment-ai-log |
| リファラル採用管理 | dm/(recurit)/referral/page.tsx | /adm/referral |
| リファラル詳細 | dm/(recurit)/referral/[id]/page.tsx | /adm/referral/[id] |
| リファラル求人掲載 | dm/(recurit)/referral/postings/page.tsx | /adm/referral/postings |
| リファラル報奨金設定 | dm/(recurit)/referral/rewards/page.tsx | /adm/referral/rewards |
| **── 研修 ──** | | |
| eラーニングコース管理 | dm/(el)/el-courses/page.tsx | /adm/el-courses |
| eラーニングコース詳細 | dm/(el)/el-courses/[id]/page.tsx | /adm/el-courses/[id] |
| 受講割当管理 | dm/(el)/el-assignments/page.tsx | /adm/el-assignments |
| **── 勤怠・労務 ──** | | |
| 勤怠ダッシュボード | dm/attendance/dashboard/page.tsx | /adm/attendance/dashboard |
| QR勤怠管理 | dm/(qr_atendance)/qr_atendance/page.tsx | /adm/qr_atendance |
| 残業設定 | dm/(qr_atendance)/overtime-settings/page.tsx | /adm/overtime-settings |
| CSVインポート（勤怠） | dm/(csv_atendance)/csv_atendance/page.tsx | /adm/csv_atendance |
| PCログ勤怠承認 | dm/(pc_atendance)/approve_pc/page.tsx | /adm/approve_pc |
| 36協定分析 | dm/(overtime)/36analysis/page.tsx | /adm/36analysis |
| 月次勤怠締め一覧 | dm/(overtime)/closure/page.tsx | /adm/closure |
| 月次締め詳細 | dm/(overtime)/closure/[closure_id]/page.tsx | /adm/closure/[closure_id] |
| タイムカード修正 | dm/(overtime)/closure/[closure_id]/timecard/page.tsx | /adm/closure/[closure_id]/timecard |
| 労働法令コンプライアンス | dm/(labor_compliance)/labor-compliance/page.tsx | /adm/labor-compliance |
| **── AI・分析 ──** | | |
| HRアシスタント（AI） | dm/(ai_agent)/hr-assistant/page.tsx | /adm/hr-assistant |
| AI職場改善提案 | dm/(ai_agent)/ai-workplace-improvement/page.tsx | /adm/ai-workplace-improvement |
| チャットナレッジ管理 | dm/(ai_agent)/inquiry-chat-knowledge/page.tsx | /adm/inquiry-chat-knowledge |
| HR KPIダッシュボード | dm/(hr_kpi)/hr-kpi/page.tsx | /adm/hr-kpi |
| 自動配信設定 | dm/(toolBox)/auto-distribution/page.tsx | /adm/auto-distribution |
| 操作マニュアル | dm/(manual)/manual/page.tsx | /adm/manual |

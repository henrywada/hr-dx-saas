# HR-DX SaaS 操作マニュアル ── ② 一般従業員向け

**対象ユーザー：** 一般社員（employee ロール）  
**アクセス範囲：** src/app/(tenant)/(tenant-users)/  
**バージョン：** 0.1（初稿）  
**最終更新：** 2026-07-01

---

## 目次

1. [ポータルトップ（ホーム画面）](#1-ポータルトップホーム画面)
2. [コンディションチェックイン](#2-コンディションチェックイン)
3. [ストレスチェック（回答）](#3-ストレスチェック回答)
4. [感謝・称賛（Kudos）](#4-感謝称賛kudos)
5. [社内イベント（参加登録）](#5-社内イベント参加登録)
6. [社内ディレクトリ（チームコネクト）](#6-社内ディレクトリチームコネクト)
7. [アンケート回答](#7-アンケート回答)
8. [自分の人事評価シート](#8-自分の人事評価シート)
9. [360度評価（自己回答）](#9-360度評価自己回答)
10. [1on1 記録の確認](#10-1on1-記録の確認)
11. [キャリア面談の確認](#11-キャリア面談の確認)
12. [eラーニング（研修コース受講）](#12-eラーニング研修コース受講)
13. [自分のスキルポータル](#13-自分のスキルポータル)
14. [勤怠（自己管理）](#14-勤怠自己管理)
15. [残業申請と承認](#15-残業申請と承認)
16. [リファラル採用（社員紹介）](#16-リファラル採用社員紹介)
17. [相談窓口チャット](#17-相談窓口チャット)
18. [人事へのお問い合わせ](#18-人事へのお問い合わせ)
19. [設定（プロフィール）](#19-設定プロフィール)

---

## ルート構成

| 機能 | URL パス |
|---|---|
| ポータルトップ | /top |
| コンディション | /condition |
| ストレスチェック | /stress-check |
| ストレスチェック結果 | /stress-check/result |
| 感謝・称賛 | /kudos |
| 社内イベント | /events |
| 社内ディレクトリ | /team-connect |
| アンケート | /survey / /answers |
| 自己評価シート | /my-evaluation |
| 360度評価 | /my-evaluation-360 |
| 1on1 記録 | /my-one-on-one |
| キャリア面談 | /career-discussions |
| eラーニング | /el-courses |
| スキルポータル | /my-skills |
| 勤怠（自己） | /attendance/self |
| 残業申請 | /application |
| 残業承認（マネージャー） | /approval |
| リファラル | /referral / /referral/my |
| 相談窓口 | /consultation |
| プロフィール設定 | /settings/profile |

---

## 1. ポータルトップ（ホーム画面）

ログイン後に表示される起点画面です。

![ポータルトップ](./images/emp_01_top.png)

| エリア | 内容 |
|---|---|
| **お知らせ** | 人事・管理者からのアナウンス、個人宛通知 |
| **コンディションチェックイン** | 今日の体調を5段階で記録するウィジェット |
| **タスク** | 期限のある未完了タスク（ストレスチェック・評価など） |
| **メニュー** | 各機能へのリンク |

---

## 2. コンディションチェックイン

毎日の体調・メンタル状態を記録します。

### 手順

1. トップのウィジェットまたはメニューの **「コンディション」** を選択します。

   ![コンディション画面](./images/emp_02_condition.png)

2. **1（とても悪い）〜 5（とても良い）** のスコアを選択します。
3. 任意でコメントを入力します。
4. **「記録する」** をクリックします。

> **注意：** 同日に複数回記録すると最新値で上書きされます。  
> **アラート：** 低スコア（1〜2）が連続、またはスコアが急落すると産業医・保健師へ自動通知されます。

### チームのコンディション傾向の確認

マネージャーは /condition/team-trend でチームメンバーの傾向を閲覧できます。

---

## 3. ストレスチェック（回答）

会社が設定した実施期間中のみ回答できます。

### 手順

1. メニューまたはトップのタスクから **「ストレスチェック」** を選択します。

   ![ストレスチェック開始](./images/emp_03_stress_start.png)

2. 案内を確認後、**「回答を開始する」** をクリックします。
3. 質問（最大57問）に **1〜4** の選択肢で順番に回答します。

   ![ストレスチェック回答](./images/emp_04_stress_answer.png)

4. 全問回答後、**「送信する」** をクリックします。

### 結果の確認

- /stress-check/result で自分の結果（スコアA〜D）を確認できます。

  ![ストレスチェック結果](./images/emp_05_stress_result.png)

- **高ストレス判定の場合：** 産業医との面談希望を画面から申請できます。

> **注意：** 同一期間の回答は1回のみです。

---

## 4. 感謝・称賛（Kudos）

### メッセージを送る

1. メニューから **「感謝・称賛」** を選択します。

   ![Kudos一覧](./images/emp_06_kudos_list.png)

2. **「感謝を送る」** をクリックします。

   ![Kudos送信](./images/emp_07_kudos_form.png)

3. 宛先（複数可）・本文・バリュータグ（任意）を入力して **「送信」** します。
4. 受信者のお知らせ欄に通知が届きます（例：💛 ○○さんから感謝が届きました）。

### リアクションする

- フィードの投稿の 💛 ボタンをクリックします（再クリックで取り消し）。

---

## 5. 社内イベント（参加登録）

1. メニューから **「社内イベント」** を選択します。

   ![イベント一覧](./images/emp_08_events.png)

2. 参加したいイベントをクリックし、詳細を確認します。
3. **「参加する」**（RSVP）をクリックして登録します。
4. 取り消すには同ボタンを再度クリックします。

---

## 6. 社内ディレクトリ（チームコネクト）

1. メニューから **「チームコネクト」** を選択します。

   ![社内ディレクトリ](./images/emp_09_team_connect.png)

2. 氏名・部署名で検索・フィルタリングできます。
3. 従業員カードをクリックすると役職・部署を確認できます。

> **注意：** メールアドレス等の個人情報は表示されません（閲覧専用）。

---

## 7. アンケート回答

1. トップのタスクまたはメニューから **「アンケート」** を選択します。

   ![アンケート一覧](./images/emp_10_survey_list.png)

2. 未回答のアンケートを選択して質問に回答します。

   ![アンケート回答](./images/emp_11_survey_answer.png)

3. 全問回答後 **「送信」** をクリックします。

> **注意：** 送信後の変更はできません。

---

## 8. 自分の人事評価シート

### 自己評価の入力

1. トップのタスクまたはメニューから **「人事評価」** を選択します。

   ![評価シート一覧](./images/emp_12_eval_list.png)

2. 自分が担当するシートを選択します。
3. 各項目にスコア（1〜5）とコメントを入力します。

   ![評価シート入力](./images/emp_13_eval_input.png)

4. **「保存」** で一時保存、全項目入力後 **「提出」** をクリックします。

### 評価結果の確認

評価フロー完了後、確定スコア（S/A/B/C/D）と100点換算の最終スコアが表示されます。

| 評点 | 100点換算 |
|---|---|
| S | 90点以上 |
| A | 80〜89点 |
| B | 70〜79点 |
| C | 60〜69点 |
| D | 59点以下 |

---

## 9. 360度評価（自己回答）

1. メニューから **「360度評価」** を選択します。

   ![360度評価](./images/emp_14_eval360.png)

2. 依頼元の評価者を選択し、評価フォームに回答します。
3. **「送信」** をクリックして完了です。

---

## 10. 1on1 記録の確認

1. メニューから **「1on1」** を選択します。

   ![1on1一覧](./images/emp_15_one_on_one.png)

2. 上司が記録した面談セッション一覧が表示されます。
3. 各セッションをクリックするとテーマ・メモ・次回予定日を確認できます。

> **注意：** 記録の作成・編集は上司（マネージャー）または人事ロールのみです。

---

## 11. キャリア面談の確認

1. メニューから **「キャリア面談」** を選択します。

   ![キャリア面談](./images/emp_16_career.png)

2. 自分に関する面談履歴（テーマ・キャリア志向・メモ・次回予定）を確認できます。

---

## 12. eラーニング（研修コース受講）

1. メニューから **「研修コース」** を選択します。

   ![eラーニング一覧](./images/emp_17_el_list.png)

2. 受講期間内のコースを選択します。
3. スライド（テキスト・画像・動画）を順番に閲覧します。

   ![スライド閲覧](./images/emp_18_el_slide.png)

4. 修了テストがある場合は回答して **「提出」** します。
5. 受講完了後、履歴に記録されます。

> **注意：** 期限切れのコースは受講不可になることがあります。

---

## 13. 自分のスキルポータル

### スキル記録の確認

1. メニューから **「マイスキル」** を選択します（/my-skills）。

   ![マイスキル](./images/emp_19_my_skills.png)

2. 自分のスキルマップと習熟度が一覧表示されます。

### スキルジャーニーの相談

- /my-skills/journey/consult でAIアシスタントにスキルアップの相談ができます。

### スキル承認申請

- マネージャーは /skill-approvals/journey でメンバーのスキル申請を確認・承認できます。

---

## 14. 勤怠（自己管理）

### 自分の勤怠記録の確認

1. メニューから **「勤怠」** を選択します。

   ![勤怠自己](./images/emp_20_attendance_self.png)

2. 月次の出勤・退勤時刻・実働時間が一覧表示されます。

### QR打刻（/apps/attendance/qr-punch）

1. 打刻ページを開き **「出勤」** または **「退勤」** を選択します。
2. 表示されたQRコードをスキャン端末（または /apps/attendance/scan）で読み取ります。

   ![QR打刻](./images/emp_21_qr_punch.png)

> **注意：** QRコードの有効期限は **5分** です。時間切れの場合は画面を更新してください。

---

## 15. 残業申請と承認

### 残業申請（一般社員）

1. メニューから **「残業申請」** を選択します（/application）。

   ![残業申請](./images/emp_22_overtime_app.png)

2. **「新規申請」** をクリックし、日付・残業時間・理由を入力して **「申請する」** をクリックします。
3. 申請状況は一覧画面で確認できます。

| ステータス | 説明 |
|---|---|
| 申請中 | 上長の確認待ち |
| 承認済み | 承認完了 |
| 差戻し | 修正して再申請が必要 |
| 却下 | 申請が却下された |

### 残業承認（マネージャー）

1. メニューから **「残業承認」** を選択します（/approval）。
2. 部下からの申請一覧が表示されます。
3. 内容を確認し **「承認」** または **「差戻し」** をクリックします。

---

## 16. リファラル採用（社員紹介）

### 紹介の登録

1. メニューから **「社員紹介」** を選択します（/referral）。

   ![リファラル](./images/emp_23_referral.png)

2. **「紹介する」** をクリックし、紹介先求人・紹介者情報を入力して送信します。

### 自分の紹介状況の確認

- /referral/my で紹介した候補者の選考状況を確認できます。

---

## 17. 相談窓口チャット

1. メニューから **「相談窓口」** を選択します（/consultation）。

   ![相談窓口](./images/emp_24_consultation.png)

2. **「相談を始める」** をクリックし、内容を入力して送信します。
3. 担当者からの返信はお知らせ欄に通知されます。

### 受信トレイ（担当者・産業医）

産業医・保健師・HR担当者は /consultation/inbox で相談を受信・返信できます。

---

## 18. 人事へのお問い合わせ

1. ポータルトップまたはメニューから **「人事へのお問い合わせ」** を選択します。

   ![人事問合せ](./images/emp_25_hr_inquiry.png)

2. **件名**（最大200文字）・**本文**（最大8,000文字）を入力して **「送信」** をクリックします。
3. 人事担当のメールアドレスに自動送信されます。

---

## 19. 設定（プロフィール）

### プロフィール変更

1. メニューの **「設定」→「プロフィール」** を選択します（/settings/profile）。

   ![プロフィール設定](./images/emp_26_profile.png)

2. 変更したい項目を編集して **「保存」** をクリックします。

### メンバー管理

- /settings/members でチームメンバー一覧の確認ができます（ロールによって閲覧範囲が異なります）。

---

## よくあるエラーと対処法

| メッセージ | 原因 | 対処 |
|---|---|---|
| 「従業員情報が見つかりません」 | アカウントと従業員情報が未紐付け | システム管理者に連絡 |
| 「すでに回答済みです」 | 同一期間に重複回答 | 再回答不要（1回のみ） |
| 「QRコードの有効期限切れ」 | 5分超過 | 画面更新して再取得 |
| 「権限がありません」 | ロール権限外の操作 | 管理者に連絡 |
| 「回答の保存に失敗しました」 | ネットワーク不具合 | ページ再読み込み後再試行 |

---

## ページコンポーネント一覧

本マニュアル対象のページコンポーネントと実際のURLパスの対応表です。  
Next.jsのルートグループ（括弧付きディレクトリ）はURLに含まれません。

| 処理名称 | コンポーネントファイル | URLパス（実際のアクセスURL） |
|---|---|---|
| ポータルトップ | (tenant-users)/top/page.tsx | /top |
| トップサブメニュー | (tenant-users)/top/subMenu/page.tsx | /top/subMenu |
| コンディション記録 | (tenant-users)/condition/page.tsx | /condition |
| チームコンディション傾向 | (tenant-users)/condition/team-trend/page.tsx | /condition/team-trend |
| ストレスチェック回答 | (tenant-users)/stress-check/page.tsx | /stress-check |
| ストレスチェック結果 | (tenant-users)/stress-check/result/page.tsx | /stress-check/result |
| 感謝・称賛（Kudos） | (tenant-users)/kudos/page.tsx | /kudos |
| 社内イベント一覧 | (tenant-users)/events/page.tsx | /events |
| 社内ディレクトリ | (tenant-users)/team-connect/page.tsx | /team-connect |
| アンケート回答 | (tenant-users)/survey/answer/page.tsx | /survey/answer |
| 回答履歴 | (tenant-users)/answers/page.tsx | /answers |
| 自己評価シート一覧 | (tenant-users)/my-evaluation/page.tsx | /my-evaluation |
| 自己評価シート詳細 | (tenant-users)/my-evaluation/[sheetId]/page.tsx | /my-evaluation/[sheetId] |
| 360度評価一覧 | (tenant-users)/my-evaluation-360/page.tsx | /my-evaluation-360 |
| 360度評価（回答者別） | (tenant-users)/my-evaluation-360/[reviewerId]/page.tsx | /my-evaluation-360/[reviewerId] |
| 1on1 記録確認 | (tenant-users)/my-one-on-one/page.tsx | /my-one-on-one |
| キャリア面談確認 | (tenant-users)/career-discussions/page.tsx | /career-discussions |
| eラーニングコース一覧 | (tenant-users)/(el)/el-courses/page.tsx | /el-courses |
| eラーニング受講 | (tenant-users)/(el)/el-courses/[assignmentId]/page.tsx | /el-courses/[assignmentId] |
| スキルポータル（マイスキル） | (tenant-users)/(skill_portal)/my-skills/page.tsx | /my-skills |
| スキルジャーニー | (tenant-users)/(skill_portal)/my-skills/journey/page.tsx | /my-skills/journey |
| スキルジャーニー相談（AI） | (tenant-users)/(skill_portal)/my-skills/journey/consult/page.tsx | /my-skills/journey/consult |
| スキル承認申請一覧 | (tenant-users)/(skill_portal)/skill-approvals/page.tsx | /skill-approvals |
| スキル承認ジャーニー | (tenant-users)/(skill_portal)/skill-approvals/journey/[employeeId]/page.tsx | /skill-approvals/journey/[employeeId] |
| スキル申請提案 | (tenant-users)/(skill_portal)/skill-approvals/journey/[employeeId]/propose/page.tsx | /skill-approvals/journey/[employeeId]/propose |
| 勤怠（自己管理） | (tenant-users)/attendance/self/page.tsx | /attendance/self |
| 残業申請 | (tenant-users)/(overtime)/application/page.tsx | /application |
| 残業承認 | (tenant-users)/(overtime)/approval/page.tsx | /approval |
| リファラル採用 | (tenant-users)/referral/page.tsx | /referral |
| 自分の紹介状況 | (tenant-users)/referral/my/page.tsx | /referral/my |
| 相談窓口（送信） | (tenant-users)/consultation/page.tsx | /consultation |
| 相談詳細 | (tenant-users)/consultation/[id]/page.tsx | /consultation/[id] |
| 相談受信トレイ | (tenant-users)/consultation/inbox/page.tsx | /consultation/inbox |
| 相談受信詳細 | (tenant-users)/consultation/inbox/[id]/page.tsx | /consultation/inbox/[id] |
| デバイスペアリング | (tenant-users)/device-pairing/page.tsx | /device-pairing |
| ビジネス管理（myou） | (tenant-users)/myou/companies/page.tsx | /myou/companies |
| 配送スキャン | (tenant-users)/myou/delivery-scan/page.tsx | /myou/delivery-scan |
| 期限切れアラート | (tenant-users)/myou/expiration-alerts/page.tsx | /myou/expiration-alerts |
| トレーサビリティ | (tenant-users)/myou/traceability/page.tsx | /myou/traceability |
| リモートワーク | (tenant-users)/remort_work/page.tsx | /remort_work |
| ビジネスページ | (tenant-users)/biz/page.tsx | /biz |

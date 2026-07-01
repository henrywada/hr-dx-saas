# HR-DX SaaS 操作マニュアル ── ⑤ その他（共通・公開ページ・API）

**対象ユーザー：** 全ユーザー共通 / 外部アクセス（URLリンク経由）  
**バージョン：** 0.1（初稿）  
**最終更新：** 2026-07-01

---

## 目次

1. [テナント共通ページ](#1-テナント共通ページ)
   - 1.1 [初回オンボーディング](#11-初回オンボーディング)
   - 1.2 [QR打刻専用ページ](#12-qr打刻専用ページ)
   - 1.3 [給与明細・請求書](#13-給与明細請求書)
   - 1.4 [アプリダッシュボード](#14-アプリダッシュボード)
   - 1.5 [設定（メンバー・プロフィール）](#15-設定メンバープロフィール)
2. [公開ページ（認証不要）](#2-公開ページ認証不要)
   - 2.1 [相談窓口ステータス確認](#21-相談窓口ステータス確認)
   - 2.2 [候補者パルスアンケート](#22-候補者パルスアンケート)
3. [APIエンドポイント一覧](#3-apiエンドポイント一覧)
4. [用語集・ロール権限対応表](#4-用語集ロール権限対応表)
5. [マニュアル全体インデックス](#5-マニュアル全体インデックス)

---

## 1. テナント共通ページ

認証済みの全ロールがアクセス可能なページです。

### ルート構成

| 機能 | URL パス | アクセス権限 |
|---|---|---|
| オンボーディング | /onboarding | tenant_admin（初回のみ） |
| QR打刻 | /apps/attendance/qr-punch | 全員 |
| QRスキャン | /apps/attendance/scan | 全員 |
| 給与明細 | /apps/payroll / /apps/payroll/[id] | 全員（自分の分のみ） |
| 請求書 | /apps/invoice | tenant_admin |
| ダッシュボード | /dashboard | 全員 |
| アプリメニュー | /menu | 全員 |
| プロフィール設定 | /settings/profile | 全員 |
| メンバー管理 | /settings/members | tenant_admin |

---

### 1.1 初回オンボーディング

テナント管理者が初めてログインした際に自動的に遷移します。

1. /onboarding が表示されます。

   ![オンボーディング](./images/other_01_onboarding.png)

2. **「会社URLを分析する」** ボタンをクリックし、自社のWebサイトURLを入力します。
3. AIが自動的に会社情報（会社名・事業内容・理念・社風）を抽出します。
4. 内容を確認・修正して **「保存して次へ」** をクリックします。
5. オンボーディング完了後、ポータルトップへ遷移します。

> **ポイント：** オンボーディング完了後、	enants.onboarding_completed_at に完了日時が記録されます。  
> スキップした場合でも、後から設定画面（/adm/settings）で再設定できます。

---

### 1.2 QR打刻専用ページ

#### QRコード生成（/apps/attendance/qr-punch）

1. 打刻の種類を選択します：
   - **出勤（punch_in）**
   - **退勤（punch_out）**

   ![QR打刻](./images/other_02_qr_punch.png)

2. QRコードが画面に表示されます（有効期限：**5分**）。
3. スキャン端末または従業員のスマートフォンで読み取ります。

#### QRスキャン（/apps/attendance/scan）

1. 従業員のスマートフォンから /apps/attendance/scan にアクセスします。

   ![QRスキャン](./images/other_03_qr_scan.png)

2. カメラが起動し、QRコードを読み取ります。
3. 打刻成功のメッセージが表示されます。

> **セキュリティ：** QRコードにはHMAC-SHA256署名が含まれており、なりすまし打刻を防止しています。

---

### 1.3 給与明細・請求書

#### 給与明細の確認

1. メニューまたは /apps/payroll を開きます。

   ![給与明細](./images/other_04_payroll.png)

2. 支給月の一覧が表示されます。
3. 対象月をクリックすると詳細明細（/apps/payroll/[id]）が表示されます。

#### 請求書（テナント管理者）

1. /apps/invoice で会社に対する利用料請求書を確認します。

---

### 1.4 アプリダッシュボード

- /dashboard でテナント全体の利用状況サマリーを確認できます。

---

### 1.5 設定（メンバー・プロフィール）

#### プロフィール設定

1. /settings/profile で自分のプロフィール（表示名・アバターなど）を変更できます。

#### メンバー管理（テナント管理者）

1. /settings/members でテナント内のユーザー一覧・ロール設定を管理します。

---

## 2. 公開ページ（認証不要）

ログインなしでアクセスできるページです。URLを知っていれば誰でもアクセス可能です。

### ルート構成

| 機能 | URL パス | 用途 |
|---|---|---|
| 相談ステータス確認 | /p/consultation/status | 相談者が自分の相談ステータスを確認 |
| 候補者パルス | /p/pulse/[id] | 採用候補者へのパルスアンケート回答 |

---

### 2.1 相談窓口ステータス確認

相談を送信した外部ユーザー（匿名含む）が相談の状況を確認するページです。

1. 相談送信時に発行された **相談ID** または **確認コード** を入力します。

   ![相談ステータス](./images/other_05_consultation_status.png)

2. 相談の現在のステータス（受付済み・対応中・完了）が表示されます。

---

### 2.2 候補者パルスアンケート

採用候補者に送付するパルスアンケートのページです。

1. 採用担当者が候補者にURLを送付します。
2. 候補者は /p/pulse/[id] を開き、アンケートに回答します。

   ![候補者パルス](./images/other_06_candidate_pulse.png)

3. 回答内容は採用担当者の管理画面に反映されます。

---

## 3. APIエンドポイント一覧

開発者・システム連携用の参考情報です。

| エンドポイント | 用途 |
|---|---|
| GET/POST /api/auth/callback | Supabase認証コールバック |
| GET /api/feed/[tenantId] | テナントのお知らせフィード |
| POST /api/closure/execute | 月次勤怠締め実行 |
| GET /api/closure/[closure_id]/aggregate | 月次集計データ取得 |
| POST /api/closure/[closure_id]/approve | 締め承認 |
| POST /api/closure/[closure_id]/lock | 締めロック |
| POST /api/closure/[closure_id]/reopen | 締め再オープン |
| GET /api/adm/work-time-records/monthly-summary | 月次勤怠サマリー |
| GET /api/overtime/applications | 残業申請一覧 |
| POST /api/overtime/applications/[id]/approve | 残業申請承認 |
| POST /api/overtime/applications/[id]/reject | 残業申請却下 |
| POST /api/overtime/applications/[id]/request_correction | 残業申請差戻し |
| GET/POST /api/el-slides/[slideId]/image | スライド画像管理 |
| GET/POST /api/el-slides/[slideId]/video | スライド動画管理 |
| GET /api/analysis/trend | トレンド分析データ |
| POST /api/auto-distribution/run-due | 自動配信実行 |
| POST /api/webhooks/stripe | Stripe Webhook受信 |
| GET /api/system-master/roles | ロール一覧 |
| GET /api/system-master/services | サービス一覧 |
| GET /api/system-master/categories | カテゴリ一覧 |

> **認証：** /api/auth 以外のAPIエンドポイントはログイン（Supabaseセッション）が必要です。  
> 未認証の場合は { ok: false, error: 

---

## ページコンポーネント一覧（テナント共通・公開ページ）

本マニュアル対象のページコンポーネントと実際のURLパスの対応表です。

| 処理名称 | コンポーネントファイル | URLパス（実際のアクセスURL） |
|---|---|---|
| **── テナント共通（認証必要） ──** | | |
| 初回オンボーディング | (tenant)/onboarding/page.tsx | /onboarding |
| 勤怠アプリ（トップ） | (tenant)/apps/attendance/page.tsx | /apps/attendance |
| QR打刻（コード表示） | (tenant)/apps/attendance/qr-punch/page.tsx | /apps/attendance/qr-punch |
| QRスキャン（打刻読取） | (tenant)/apps/attendance/scan/page.tsx | /apps/attendance/scan |
| 給与明細一覧 | (tenant)/apps/payroll/page.tsx | /apps/payroll |
| 給与明細詳細 | (tenant)/apps/payroll/[id]/page.tsx | /apps/payroll/[id] |
| 請求書 | (tenant)/apps/invoice/page.tsx | /apps/invoice |
| プロフィール設定 | (tenant)/settings/profile/page.tsx | /settings/profile |
| メンバー管理 | (tenant)/settings/members/page.tsx | /settings/members |
| **── 公開ページ（認証不要） ──** | | |
| 相談窓口ステータス確認 | p/consultation/status/page.tsx | /p/consultation/status |
| 候補者パルスアンケート | p/pulse/[id]/page.tsx | /p/pulse/[id] |

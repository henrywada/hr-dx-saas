# HR-DX SaaS 操作マニュアル ── ④ SaaS管理者向け

**対象ユーザー：** SaaS事業者の運営スタッフ（developer / saas_admin ロール）  
**アクセス範囲：** src/app/(saas-admin)/saas_adm/  
**バージョン：** 0.1（初稿）  
**最終更新：** 2026-07-01

> **重要：** 本画面はSaaSプラットフォームの運営管理専用です。一般のテナント（企業）ユーザーはアクセスできません。

---

## 目次

1. [テナント（企業）管理](#1-テナント企業管理)
2. [システムマスタ管理](#2-システムマスタ管理)
3. [グローバル評価テンプレート](#3-グローバル評価テンプレート)
4. [eラーニンググローバルテンプレート](#4-eラーニンググローバルテンプレート)
5. [グローバルスキルテンプレート](#5-グローバルスキルテンプレート)
6. [パルステンプレート（Echoテンプレート）](#6-パルステンプレートechoテンプレート)
7. [Stripeサブスクリプション管理](#7-stripeサブスクリプション管理)
8. [アクセスログ・監視](#8-アクセスログ監視)

---

## ルート構成

| 機能 | URL パス |
|---|---|
| テナント一覧 | /saas_adm/tenants |
| システムマスタ | /saas_adm/system-master |
| グローバル評価テンプレート | /saas_adm/evaluation-global-templates |
| eラーニングテンプレート | /saas_adm/el-templates |
| スキルテンプレート | /saas_adm/skill-templates |
| Echoテンプレート | /saas_adm/echo_template |

---

## 1. テナント（企業）管理

### テナント一覧の確認

1. SaaS管理ページ（/saas_adm/tenants）を開きます。

   ![テナント一覧](./images/saas_01_tenants.png)

2. 契約中の全テナント（企業）が一覧表示されます。
3. テナント名・プラン・契約日・ステータスが確認できます。

### テナント詳細の確認・編集

1. テナント名をクリックすると詳細画面が表示されます。
2. 確認・編集できる主な項目：

| 項目 | 説明 |
|---|---|
| **会社名** | テナントの会社名 |
| **プラン** | free / pro / enterprise |
| **契約終了日** | contract_end_at（nullの場合は無期限） |
| **有効サービス** | 有効になっているサービス（機能モジュール） |
| **オンボーディング状態** | 初回設定の完了状況 |

### テナントの新規作成（手動登録）

サインアップ経由以外でテナントを手動登録する場合：

1. **「新規テナント作成」** ボタンをクリックします。
2. 会社名・管理者メールアドレス・プランを入力します。
3. **「作成」** をクリックすると、管理者アカウントと招待メールが自動生成されます。

### プランの変更

1. テナント詳細画面でプランを変更します。
2. Stripe との連携がある場合、サブスクリプションが自動的に更新されます。

---

## 2. システムマスタ管理

### サービス（機能モジュール）管理

1. /saas_adm/system-master を開きます。

   ![システムマスタ](./images/saas_02_system_master.png)

2. **「サービス管理」** タブで機能モジュール（サービス）の一覧を管理します。

| 項目 | 説明 |
|---|---|
| サービス名 | 機能の識別名 |
| カテゴリ | グループ分類 |
| デフォルト有効 | 新規テナントで自動的に有効になるか |

### アプリロール管理

- **「ロール管理」** タブでシステム全体のロール定義を管理します。

| ロール名 | 対象ユーザー |
|---|---|
| employee | 一般社員 |
| manager | チームマネージャー |
| hr | 人事担当者 |
| hr_manager | 人事責任者 |
| 	enant_admin | テナント管理者 |
| company_doctor | 産業医 |
| company_nurse | 保健師 |
| developer | 開発者・SaaS管理者 |

### カテゴリ管理

- **「カテゴリ管理」** タブでサービスカテゴリの追加・編集を行います。

---

## 3. グローバル評価テンプレート

全テナントで共通して使用できる評価テンプレートの管理です。

### テンプレートの作成

1. /saas_adm/evaluation-global-templates を開きます。

   ![グローバル評価テンプレート](./images/saas_03_eval_templates.png)

2. **「新規作成」** をクリックします。
3. テンプレート名・評価軸・評価項目・重みを設定します。
4. **「公開」** をクリックするとテナント管理者がコピーして使用できるようになります。

### テンプレートの編集

1. テンプレート一覧から対象をクリックします（/saas_adm/evaluation-global-templates/[templateId]）。
2. 項目の追加・編集・削除を行います。
3. 公開中のテンプレートを変更するとテナント側の既存コピーには影響しません。

---

## 4. eラーニンググローバルテンプレート

全テナントで共有できる研修コーステンプレートの管理です。

### テンプレートの作成

1. /saas_adm/el-templates を開きます。

   ![eラーニングテンプレート](./images/saas_04_el_templates.png)

2. **「新規コース作成」** をクリックします。
3. タイトル・カテゴリ・学習目標・スライドを設定します。
4. スライドへの画像・動画のアップロードが可能です。

### テンプレートの編集

1. 一覧からコースをクリックします（/saas_adm/el-templates/[id]）。
2. スライドの追加・順序変更・内容編集を行います。

### テナントへの公開設定

- course_type = 'template' に設定したコースがグローバルテンプレートとして公開されます。
- テナント管理者はこれをコピーして独自コース（course_type = 'tenant'）を作成します。

---

## 5. グローバルスキルテンプレート

全テナントが利用できるスキルフレームワークテンプレートの管理です。

### テンプレートの管理

1. /saas_adm/skill-templates を開きます。

   ![スキルテンプレート](./images/saas_05_skill_templates.png)

2. スキルカテゴリ・スキル項目・習熟度レベルを設定します。
3. テナント管理者はこのテンプレートをコピーして自社用スキルマップを作成します。

---

## 6. パルステンプレート（Echoテンプレート）

全テナントで使用できるパルスアンケートのテンプレートを管理します。

### テンプレートの管理

1. /saas_adm/echo_template を開きます。

   ![Echoテンプレート](./images/saas_06_echo_template.png)

2. パルスアンケートの質問セット（テンプレート）を作成・編集します。
3. テナント管理者がパルスアンケートを設定する際のベースとして使用されます。

---

## 7. Stripeサブスクリプション管理

### Webhook の確認

- /api/webhooks/stripe でStripeからの支払いイベントを受信・処理します。
- イベント種別：payment_intent.succeeded / invoice.paid / customer.subscription.updated など

### プラン設定（環境変数）

| 環境変数 | 説明 |
|---|---|
| STRIPE_SECRET_KEY | Stripe APIシークレットキー |
| STRIPE_PRO_PRICE_ID | Pro プランの Stripe 価格ID |
| STRIPE_ENTERPRISE_PRICE_ID | Enterprise プランの Stripe 価格ID |

> **注意：** 環境変数の設定変更はサーバー再起動が必要です。

---

## 8. アクセスログ・監視

### アクセスログの確認

- ccess_logs テーブルにページビューが自動記録されています。
- 記録内容：パス・メソッド・IPアドレス・ユーザーエージェント・テナントID・ユーザーID

### AI利用ログの確認

- i_usage_logs テーブルにAI（Gemini）の利用状況が記録されています。
- モデル・プロンプトトークン数・レスポンストークン数・テナントIDが確認できます。

---

## セキュリティ上の注意事項

- SaaS管理ページへのアクセスは developer ロールのみ許可されています。
- マルチテナントのRLS（行レベルセキュリティ）により、テナントをまたいだデータ参照は禁止されています。
- 本番環境での操作は必ずバックアップを取った上で行ってください。

---

## よくある確認事項

| 確認事項 | 操作 |
|---|---|
| テナントのサービス有効状況 | テナント詳細 → サービス割当タブ |
| 新テナントの初期設定状況 | テナント詳細 → onboarding_completed_at |
| Stripe の支払い状況 | Stripeダッシュボード または Webhookログ |
| AI利用量の確認 | i_usage_logs テーブルを確認 |

---

## ページコンポーネント一覧

本マニュアル対象のページコンポーネントと実際のURLパスの対応表です。  
Next.jsのルートグループ（括弧付きディレクトリ）はURLに含まれません。

| 処理名称 | コンポーネントファイル | URLパス（実際のアクセスURL） |
|---|---|---|
| SaaS管理ダッシュボード | (saas-admin)/saas_adm/page.tsx | /saas_adm |
| SaaS管理サブメニュー | (saas-admin)/saas_adm/subMenu/page.tsx | /saas_adm/subMenu |
| **── テナント・基本管理 ──** | | |
| テナント（企業）一覧 | (saas-admin)/saas_adm/(base_mnt)/tenants/page.tsx | /saas_adm/tenants |
| システムマスタ管理 | (saas-admin)/saas_adm/(base_mnt)/system-master/page.tsx | /saas_adm/system-master |
| システムマスタ（旧） | (saas-admin)/system-master/page.tsx | /system-master |
| **── グローバルテンプレート ──** | | |
| グローバル評価テンプレート一覧 | (saas-admin)/saas_adm/(evaluation)/evaluation-global-templates/page.tsx | /saas_adm/evaluation-global-templates |
| グローバル評価テンプレート詳細 | (saas-admin)/saas_adm/(evaluation)/evaluation-global-templates/[templateId]/page.tsx | /saas_adm/evaluation-global-templates/[templateId] |
| eラーニングテンプレート一覧 | (saas-admin)/saas_adm/(puls)/el-templates/page.tsx | /saas_adm/el-templates |
| eラーニングテンプレート詳細 | (saas-admin)/saas_adm/(puls)/el-templates/[id]/page.tsx | /saas_adm/el-templates/[id] |
| Echoテンプレート（パルス） | (saas-admin)/saas_adm/(puls)/echo_template/page.tsx | /saas_adm/echo_template |
| グローバルスキルテンプレート | (saas-admin)/saas_adm/(skill_templates)/skill-templates/page.tsx | /saas_adm/skill-templates |

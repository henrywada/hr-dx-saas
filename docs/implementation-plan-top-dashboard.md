# 実装計画: トップ（ダッシュボード）画面のデータ駆動化

対象画面: `localhost:3000/top`（`src/app/(tenant)/(default)/top/page.tsx`）

---

## 1. 画面構成の整理

| ブロック | 内容 | 現状 | 対応 |
|----------|------|------|------|
| ウェルカム | 日付・挨拶・ロール表示 | `getServerUser()` で名前・ロール取得、日付は固定 | 日付を `new Date()` に変更し、SaaS管理者時は「SaaS管理者さん」表示を維持 |
| 重要タスク | 期限・タイトル・説明・「今すぐ回答する」CTA | ハードコード（2月28日、組織健康度アンケート） | DB の `pulse_survey_periods` と `pulse_survey_responses` で未回答判定し表示 |
| 人事からのお知らせ | 日付・タイトル・NEW バッジ・「すべて見る」 | 配列ハードコード | `announcements` テーブルから取得、一覧ページへリンク |
| クイックアクセス | 4カード（基本情報・給与明細・回答履歴・人事お問合せ） | 配列ハードコード | 設定ファイル（config）で定義し、リンク先を `APP_ROUTES` またはパスで指定 |

---

## 2. テーブル定義（新規・既存の利用）

### 2.1 新規テーブル

#### announcements（人事からのお知らせ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | 主キー |
| tenant_id | uuid FK→tenants | テナント（RLS で隔離） |
| title | text | タイトル |
| body | text | 本文（任意） |
| published_at | timestamptz | 公開日時 |
| is_new | boolean | NEW バッジ表示 |
| target_audience | text | 対象（例: 全社員対象） |
| sort_order | int | 表示順 |
| created_at, updated_at | timestamptz | 作成・更新 |

#### pulse_survey_periods（月次パルス・重要タスク表示用）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | 主キー |
| tenant_id | uuid FK→tenants | テナント（RLS で隔離） |
| survey_period | text | 期間キー（例: 2026-02） |
| title | text | 表示タイトル（例: 今月の組織健康度アンケート） |
| description | text | 説明文 |
| deadline_date | date | 回答期限 |
| link_path | text | 「今すぐ回答する」のリンク先（例: /survey/answer） |
| sort_order | int | 表示順 |
| created_at, updated_at | timestamptz | 作成・更新 |
| UNIQUE | (tenant_id, survey_period) | テナント・期間の一意 |

### 2.2 既存テーブルの利用

- **`employees`** … ユーザー名・ロール・テナント（ウェルカム）
- **`pulse_survey_responses`** … 未回答判定（当該期間に `user_id` の回答がなければ「未回答」）
- **`tenants`** … テナント情報（必要に応じて）

重要タスクの「今月の組織健康度アンケート」は、`pulse_survey_periods` で当月の 1 件を取得し、その `deadline_date` と `title` / `description` を表示。未回答は `pulse_survey_responses` に当該 `survey_period` で当該ユーザーの行が存在しないかで判定する。

---

## 3. 実装フェーズ

### Phase 1: DB マイグレーション

1. `announcements` を作成（tenant_id, title, body, published_at, is_new, target_audience, sort_order, created_at, updated_at）。
2. `pulse_survey_periods` を作成（tenant_id, survey_period, title, description, deadline_date, link_path, sort_order, created_at, updated_at）。
3. 上記に RLS を付与（tenant 隔離）。
4. 必要に応じてシードでサンプルデータ投入。

**成果物:** `supabase/migrations/YYYYMMDD_add_dashboard_tables.sql`

---

### Phase 2: フィーチャー層（queries / actions）

1. **`src/features/dashboard/`** を新設（または既存の `src/features/survey` 等と役割分担を検討）。
2. **queries.ts**
   - `getAnnouncementsForTop(tenantId, limit)` … 公開日降順でお知らせを取得。
   - `getCurrentPulseSurveyPeriod(tenantId)` … 当月の `pulse_survey_periods` を 1 件取得。
   - `hasUserRespondedToPulseSurvey(tenantId, userId, surveyPeriod)` … 未回答なら false。
3. **types.ts** … `Announcement`, `PulseSurveyPeriod`, `ImportantTask`（表示用）などの型。
4. **actions.ts** … お知らせ作成・更新・削除（管理画面用）は必要なら Phase 4 で追加。

**成果物:** `src/features/dashboard/queries.ts`, `types.ts`

---

### Phase 3: トップページのデータバインド

1. **`src/app/(tenant)/(default)/top/page.tsx`**
   - Server Component のまま、`getServerUser()` に加え:
     - `getAnnouncementsForTop(tenantId, 5)` でお知らせ取得。
     - `getCurrentPulseSurveyPeriod(tenantId)` で重要タスクのメタ取得。
     - `hasUserRespondedToPulseSurvey(tenantId, user.id, period.survey_period)` で未回答判定。
   - 日付は `new Date()` に変更（開発用に固定日時が必要なら env や定数で切り替え）。
   - 重要タスク: 未回答かつ期限前の場合のみカード表示。表示文言は `pulse_survey_periods` の title / description / deadline_date を使用。「今すぐ回答する」のリンクは `link_path`（例: `/survey/answer`）へ。
   - お知らせ: 取得した一覧を表示。「すべて見る」は `/top/announcements` 等の一覧ルートへ（Phase 4 でルート追加）。

2. **loading.tsx / error.tsx**  
   - `(tenant)/(default)/top/` に `loading.tsx`（スケルトン）、`error.tsx`（再試行 UI）を配置（basic.md 方針に従う）。

**成果物:** 更新された `top/page.tsx`, `top/loading.tsx`, `top/error.tsx`

---

### Phase 4: ルート・リンクの整備

1. **ルート定数**
   - `src/config/routes.ts` に例:
     - `TENANT.ANNOUNCEMENTS: '/top/announcements'`
     - `TENANT.SURVEY_ANSWER: '/survey/answer'`（既存があればそれに合わせる）
     - クイックアクセス用: 基本情報 `/top/profile`, 給与明細 `/top/payroll`, 回答履歴 `/top/survey-history`, 人事お問合せ `/top/inquiry` など（実際のパスに合わせて定義）。
2. **クイックアクセス設定**
   - `src/config/dashboard-quick-access.ts` を新設（または既存の dashboard-config に統合）。
   - 項目: label, description, iconKey, path（APP_ROUTES から参照）。
3. **「今すぐ回答する」**
   - `pulse_survey_periods.link_path` を使う。未設定ならデフォルトで `/survey/answer?period=YYYY-MM` など。
4. **「すべて見る」**
   - `APP_ROUTES.TENANT.ANNOUNCEMENTS` への Link。
5. **お知らせ一覧ページ**（必要なら）
   - `src/app/(tenant)/(default)/top/announcements/page.tsx` を追加し、`announcements` を一覧表示。

**成果物:** `routes.ts` 更新、`dashboard-quick-access.ts`、必要なら `top/announcements/page.tsx`

---

## 4. クイックアクセス（設定ベース）

テーブル化しない場合の例。`src/config/dashboard-quick-access.ts`:

```ts
import { APP_ROUTES } from '@/config/routes'

export const DASHBOARD_QUICK_ACCESS = [
  { id: 'profile',    label: '基本情報の確認', desc: 'プロフィールや住所など', iconKey: 'user',    path: '/top/profile' },
  { id: 'payroll',    label: '給与明細の照会', desc: '今月・過去の明細',       iconKey: 'fileText', path: '/top/payroll' },
  { id: 'history',    label: '過去の回答履歴', desc: 'アンケート・評価など', iconKey: 'barChart', path: '/top/survey-history' },
  { id: 'inquiry',    label: '人事へのお問合せ', desc: '各種申請・相談窓口', iconKey: 'messageCircle', path: '/top/inquiry' },
] as const
```

実際のパスは既存ルーティング（メニュー・サービス）に合わせて変更する。

---

## 5. チェックリスト

- [ ] Phase 1: マイグレーション実行・RLS 確認
- [ ] Phase 2: dashboard feature（queries / types）実装
- [ ] Phase 3: top/page.tsx のデータ取得・表示・日付修正
- [ ] Phase 3: top/loading.tsx, top/error.tsx 配置
- [ ] Phase 4: APP_ROUTES とクイックアクセス設定
- [ ] Phase 4: 「今すぐ回答する」「すべて見る」リンク接続
- [ ] （任意）お知らせ一覧ページ・管理画面

---

## 6. 備考

- **SaaS管理者**でログインしている場合は、`getServerUser()` のロールに応じて「SaaS管理者さん、お疲れ様です！」のように表示を分岐済みであればそのまま利用。
- 重要タスクは「当月の 1 件」を想定。複数タスクを出す場合は `dashboard_important_tasks` のようなテーブルに拡張可能。
- お知らせの「NEW」は、公開日が一定日数以内なら `is_new` を true にする運用、または `published_at` から算出するどちらかで統一する。

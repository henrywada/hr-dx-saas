# 開発計画: ダッシュボード関連マスタの保守画面

`announcements`（人事からのお知らせ）と `pulse_survey_periods`（月次パルス調査期間）の保守画面を、テナント管理者向けに `src/app/(tenant)/(colored)/adm/(base_mnt)/` 配下に配置する計画です。

---

## 1. 対象テーブルと画面

| テーブル | 画面名（仮） | ルート | 主な操作 |
|----------|--------------|--------|----------|
| `announcements` | お知らせ管理 | `/adm/base_mnt/announcements` | 一覧・新規・編集・削除 |
| `pulse_survey_periods` | パルス調査期間管理 | `/adm/base_mnt/pulse-survey-periods` | 一覧・新規・編集・削除 |

※ `(base_mnt)` は URL に出ないルートグループ。実際のパスは `/adm/announcements`、`/adm/pulse-survey-periods` の想定（メニュー設定に依存）。

---

## 2. 配置先とディレクトリ構成

### 2.1 ページコンポーネント（App Router）

```
src/app/(tenant)/(colored)/adm/(base_mnt)/
├── employees/          # 既存
│   └── page.tsx
├── divisions/          # 既存
│   └── page.tsx
├── announcements/      # 新規
│   ├── page.tsx        # 一覧
│   ├── loading.tsx     # スケルトン（basic.md 方針）
│   └── error.tsx       # 再試行UI（basic.md 方針）
└── pulse-survey-periods/  # 新規
    ├── page.tsx        # 一覧
    ├── loading.tsx
    └── error.tsx
```

### 2.2 フィーチャー層（queries / actions / components）

既存の `src/features/dashboard/` を拡張するか、管理専用で `src/features/dashboard-admin/` を新設するか、どちらか。

**推奨:** `src/features/dashboard/` を拡張し、管理用の queries / actions / components を追加。

```
src/features/dashboard/
├── queries.ts          # 既存（getTopAnnouncements, getEmployeeImportantTask）
│                       # 追加: getAnnouncementsForAdmin, getPulseSurveyPeriodsForAdmin
├── actions.ts          # 新規: CRUD Server Actions
├── types.ts            # 既存を拡張
└── components/         # 新規
    ├── AnnouncementTable.tsx      # お知らせ一覧＋編集・削除
    ├── AnnouncementFormDialog.tsx  # 新規・編集ダイアログ
    ├── PulseSurveyPeriodTable.tsx  # 期間一覧＋編集・削除
    └── PulseSurveyPeriodFormDialog.tsx  # 新規・編集ダイアログ
```

---

## 3. 実装フェーズ

### Phase 1: ルート・型・クエリ・アクション

1. **`src/config/routes.ts` にルート定数を追加**
   ```ts
   TENANT: {
     PORTAL: '/top',
     ADMIN: '/adm',
     ADMIN_ANNOUNCEMENTS: '/adm/announcements',
     ADMIN_PULSE_SURVEY_PERIODS: '/adm/pulse-survey-periods',
   }
   ```
   ※ 実際のパスは `(base_mnt)` の階層により `/adm/announcements` 等になる想定。メニュー（service）の `route_path` と合わせる。

2. **`src/features/dashboard/types.ts` を拡張**
   - `AnnouncementRow`（管理一覧用: id, tenant_id, title, body, published_at, is_new, target_audience, sort_order, created_at, updated_at）
   - `PulseSurveyPeriodRow`（管理一覧用: id, tenant_id, survey_period, title, description, deadline_date, link_path, sort_order, created_at, updated_at）
   - フォーム用の `AnnouncementFormValues`, `PulseSurveyPeriodFormValues`（Zod スキーマと連携）

3. **`src/features/dashboard/queries.ts` に管理用クエリを追加**
   - `getAnnouncementsForAdmin()`: テナント内の全お知らせを `published_at` 降順で取得
   - `getPulseSurveyPeriodsForAdmin()`: テナント内の全期間を `survey_period` 降順で取得

4. **`src/features/dashboard/actions.ts` を新規作成**
   - `createAnnouncement(values)`, `updateAnnouncement(id, values)`, `deleteAnnouncement(id)`
   - `createPulseSurveyPeriod(values)`, `updatePulseSurveyPeriod(id, values)`, `deletePulseSurveyPeriod(id)`
   - 各アクション内で `createClient()` を使用（RLS で tenant_id を自動付与）。`revalidatePath()` で一覧ページを再検証。

---

### Phase 2: お知らせ（announcements）保守画面

1. **`AnnouncementTable.tsx`（Client Component）**
   - 一覧表示（タイトル、公開日、NEW バッジ、対象、操作ボタン）
   - 検索・フィルタ（任意）
   - 新規作成ボタン → ダイアログを開く
   - 編集ボタン → ダイアログを開く（既存データを渡す）
   - 削除ボタン → 確認ダイアログ → `deleteAnnouncement` 実行
   - `useTransition` でローディング表示

2. **`AnnouncementFormDialog.tsx`（Client Component）**
   - フォーム項目: title（必須）, body, published_at, is_new, target_audience, sort_order
   - 新規/編集モードで `createAnnouncement` / `updateAnnouncement` を呼び出し
   - 成功時にダイアログを閉じ、親で `router.refresh()` または Server Action 内の `revalidatePath` に任せる

3. **`src/app/(tenant)/(colored)/adm/(base_mnt)/announcements/page.tsx`**
   - Server Component。`getServerUser()` で認証・tenant_id 確認。未認証なら `redirect(APP_ROUTES.AUTH.LOGIN)`。
   - `getAnnouncementsForAdmin()` でデータ取得。
   - `AnnouncementTable` に Props で渡す。
   - `loading.tsx`, `error.tsx` を同階層に配置。

---

### Phase 3: パルス調査期間（pulse_survey_periods）保守画面

1. **`PulseSurveyPeriodTable.tsx`（Client Component）**
   - 一覧表示（期間、タイトル、期限、リンク先、操作ボタン）
   - 新規作成・編集・削除（AnnouncementTable と同パターン）

2. **`PulseSurveyPeriodFormDialog.tsx`（Client Component）**
   - フォーム項目: survey_period（必須・YYYY-MM 形式）, title（必須）, description, deadline_date（必須）, link_path, sort_order
   - `survey_period` は同一テナント内で UNIQUE。編集時は既存レコードの場合は変更不可にするか、または UNIQUE 制約に注意。

3. **`src/app/(tenant)/(colored)/adm/(base_mnt)/pulse-survey-periods/page.tsx`**
   - Server Component。`getPulseSurveyPeriodsForAdmin()` でデータ取得。
   - `PulseSurveyPeriodTable` に Props で渡す。
   - `loading.tsx`, `error.tsx` を配置。

---

### Phase 4: メニュー・権限

1. **メニューへの登録**
   - `service` テーブル（またはメニュー設定）に、`/adm/announcements` と `/adm/pulse-survey-periods` を登録。
   - カテゴリは `base_mnt`（基本管理）に紐づけ、`adm` ロール以上がアクセス可能とする。

2. **認可**
   - `(colored)/adm/` 配下の layout で既に管理者ガードがかかっている想定。追加の認可は既存ポリシーに従う。

---

## 4. データ項目とバリデーション

### announcements

| 項目 | 型 | 必須 | 備考 |
|------|-----|------|------|
| title | text | ○ | |
| body | text | | |
| published_at | timestamptz | ○ | デフォルト now() |
| is_new | boolean | ○ | デフォルト true |
| target_audience | text | | 例: 全社員対象 |
| sort_order | int | ○ | デフォルト 0 |

### pulse_survey_periods

| 項目 | 型 | 必須 | 備考 |
|------|-----|------|------|
| survey_period | text | ○ | YYYY-MM 形式、tenant_id と UNIQUE |
| title | text | ○ | |
| description | text | | |
| deadline_date | date | ○ | |
| link_path | text | | 例: /survey/answer |
| sort_order | int | ○ | デフォルト 0 |

Zod スキーマで `survey_period` を `z.string().regex(/^\d{4}-\d{2}$/)`、`deadline_date` を `z.coerce.date()` などで検証する。

---

## 5. UI 方針

- 既存の `employees` / `divisions` と同様に、Shadcn ベースの `components/ui` を利用。
- テーブルは `Table`、ダイアログは `Dialog`、フォームは `Input` / `Textarea` / `Checkbox` 等。
- 削除時は確認ダイアログ（AlertDialog）を表示。
- レスポンシブ対応、日本語ラベル。

---

## 6. チェックリスト

- [ ] Phase 1: routes 追加、types 拡張、queries 追加、actions 作成
- [ ] Phase 2: AnnouncementTable, AnnouncementFormDialog, announcements/page.tsx, loading.tsx, error.tsx
- [ ] Phase 3: PulseSurveyPeriodTable, PulseSurveyPeriodFormDialog, pulse-survey-periods/page.tsx, loading.tsx, error.tsx
- [ ] Phase 4: メニュー登録、権限確認
- [ ] 動作確認: 一覧表示、新規作成、編集、削除がテナント内で正しく動作すること

---

## 7. 備考

- `tenant_id` は Server Action 内で `getServerUser()` から取得するか、RLS に委ねる。`createClient()` 利用時は RLS により自動でテナント隔離される。
- `announcements` と `pulse_survey_periods` は既に RLS が有効で、`current_tenant_id()` によるポリシーが設定済み。管理者（adm）は同一テナント内のレコードのみ操作可能。
- 既存の `EmployeeTable` / `EmployeeFormDialog` を参考に、フォームのバリデーション（Zod）と Server Action のエラーハンドリングを統一する。

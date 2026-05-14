# グローバルスキルテンプレート 設計ドキュメント

**作成日:** 2026-05-15
**対象:** HR-DX SaaS — SaaS管理者によるグローバルスキルテンプレート管理＋テナント取り込み機能

---

## 背景・目的

スキルマップ v2 では「職種・技能をテナントが自由定義」する設計になったが、テナントがゼロから職種・スキル項目・スキルレベルを定義するのは手間がかかる。

SaaS管理者が業種横断の「職種テンプレート」を提供し、テナントが自社に合うものを取り込んで編集・運用できるようにする。

---

## 対象ユーザー

| ユーザー種別 | 主な操作 |
|---|---|
| SaaS管理者 | 業種カテゴリ・職種・スキル項目・スキルレベルのCRUD管理 |
| テナント管理者（人事） | テンプレートを閲覧・選択し自テナントDBへコピー、その後自社用に編集 |

---

## 設計方針

- **専用グローバルテーブル方式**（既存テナントテーブルとは完全分離）
- 取り込み後は**完全独立**（グローバル側の更新はテナント側に影響しない）
- RLSなし（全テナントがSELECT可能、書き込みはSaaS管理者のみアプリ層で制御）

---

## DBスキーマ

```sql
-- 業種カテゴリ
CREATE TABLE public.global_job_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,          -- 例: 'IT', '製造', '医療'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 職種マスタ
CREATE TABLE public.global_job_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.global_job_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,         -- 例: 'プログラマー', '溶接工'
  description TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スキル項目（職種ごと）
CREATE TABLE public.global_skill_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,         -- 例: 'Python', 'AWS', '旋盤操作'
  category    TEXT,                  -- '技術' | '知識' | '資格' | '経験'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スキルレベル（職種ごと）
CREATE TABLE public.global_skill_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,         -- 例: '初級', '上級'
  criteria    TEXT,                  -- 例: '経験3年以上'
  color_hex   TEXT NOT NULL DEFAULT '#6b7280',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.global_job_roles (category_id);
CREATE INDEX ON public.global_skill_items (job_role_id);
CREATE INDEX ON public.global_skill_levels (job_role_id);
```

RLSは設定しない。書き込みはアプリ層でSaaS管理者ロール（`appRole === 'saas_admin'`）を確認して制御する。

---

## アプリケーション構成

### ルート構成

```
src/app/(saas-admin)/saas_adm/(skill_templates)/
└── skill-templates/
    ├── page.tsx              # 業種カテゴリ + 職種一覧
    ├── loading.tsx
    └── [roleId]/
        ├── page.tsx          # 職種詳細（スキル項目 + スキルレベル管理）
        └── loading.tsx
```

### フィーチャー構成

```
src/features/global-skill-templates/
  components/
    GlobalJobCategoryManager.tsx   # 業種カテゴリ CRUD
    GlobalJobRoleList.tsx          # 職種一覧（カテゴリ別カード）
    GlobalJobRoleForm.tsx          # 職種 追加・編集フォーム
    GlobalSkillItemManager.tsx     # スキル項目 CRUD テーブル
    GlobalSkillLevelManager.tsx    # スキルレベル CRUD テーブル
  queries.ts
  actions.ts
  types.ts

src/features/skill-map/components/
  ImportFromTemplateModal.tsx      # テンプレート取り込みモーダル（既存featureに追加）
```

---

## 型定義

```typescript
// src/features/global-skill-templates/types.ts

export type GlobalJobCategory = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type GlobalJobRole = {
  id: string
  category_id: string
  category_name?: string
  name: string
  description: string | null
  color_hex: string
  sort_order: number
  created_at: string
}

export type GlobalSkillItem = {
  id: string
  job_role_id: string
  name: string
  category: string | null  // '技術' | '知識' | '資格' | '経験'
  sort_order: number
  created_at: string
}

export type GlobalSkillLevel = {
  id: string
  job_role_id: string
  name: string
  criteria: string | null
  color_hex: string
  sort_order: number
  created_at: string
}

export type GlobalJobRoleDetail = GlobalJobRole & {
  skillItems: GlobalSkillItem[]
  skillLevels: GlobalSkillLevel[]
}
```

---

## 画面仕様

### ① SaaS管理者: `/saas_adm/skill-templates`

- **左カラム:** 業種カテゴリ一覧（追加・編集・削除、クリックで右カラム絞り込み）
- **右カラム:** 選択業種の職種カード一覧
  - 色付きバッジ + 名前 + 説明文
  - スキル項目数・スキルレベル数をサブテキスト表示
  - 「＋ 職種を追加」ボタン → `GlobalJobRoleForm`（名前・色・説明・業種）
  - カードクリック → `/saas_adm/skill-templates/[roleId]` へ遷移

### ② SaaS管理者: `/saas_adm/skill-templates/[roleId]`

- 職種名・色・説明の編集（インライン）
- **スキル項目テーブル:** 名前・カテゴリ（技術/知識/資格/経験）・並び順、CRUD
- **スキルレベルテーブル:** 名前・達成基準・色・並び順、CRUD

### ③ テナント管理者: 取り込みモーダル（`ImportFromTemplateModal`）

- 起動: `TenantSkillManager` に「📥 テンプレートから取り込む」ボタン追加
- 業種チップで職種を絞り込み
- 職種カード一覧（スキル項目数・スキルレベル数プレビュー）
- カードクリック → 詳細プレビュー展開（スキル項目・レベル一覧）
- 「取り込む」ボタン → `importFromGlobalTemplate(jobRoleId)` 実行
  - `tenant_skills` に1行 INSERT（name, color_hex）
  - `skill_requirements` に `global_skill_items` の件数分 INSERT
  - `skill_levels` に `global_skill_levels` の件数分 INSERT
- 既にコピー済みの職種は「取り込み済み」バッジ表示（再取り込み可）
- 成功後: `revalidatePath('/adm/skill-map')` + モーダルを閉じる

---

## データフロー

```
[SaaS管理者画面]
page.tsx（Server Component）
  → queries.ts: getGlobalJobCategories(), getGlobalJobRoles(categoryId?)
  → GlobalJobRoleList, GlobalJobCategoryManager（Client Components）に props 渡し

actions.ts（SaaS管理者のみ: appRole === 'saas_admin' を確認）
  → createGlobalJobCategory / updateGlobalJobCategory / deleteGlobalJobCategory
  → createGlobalJobRole / updateGlobalJobRole / deleteGlobalJobRole
  → createGlobalSkillItem / updateGlobalSkillItem / deleteGlobalSkillItem
  → createGlobalSkillLevel / updateGlobalSkillLevel / deleteGlobalSkillLevel

[テナント管理者画面]
ImportFromTemplateModal
  → queries.ts: getGlobalJobRoleDetail(jobRoleId)
  → actions.ts: importFromGlobalTemplate(jobRoleId)
      ├── INSERT tenant_skills（1行）
      ├── INSERT skill_requirements（スキル項目分）
      └── INSERT skill_levels（スキルレベル分）
      → revalidatePath('/adm/skill-map')
```

---

## SaaS管理者認証

```typescript
const user = await getServerUser()
if (user?.appRole !== 'saas_admin') return { success: false, error: '権限がありません' }
```

---

## ルート定数（追加）

```typescript
// src/config/routes.ts の SAAS セクションに追加
SKILL_TEMPLATES: '/saas_adm/skill-templates',
SKILL_TEMPLATE_DETAIL: (roleId: string) => `/saas_adm/skill-templates/${roleId}`,
```

---

## 実装フェーズ

| # | 内容 | 完了条件 |
|---|---|---|
| 1 | マイグレーション（4テーブル + インデックス） | `supabase migration up` 成功 |
| 2 | types.ts / queries.ts / actions.ts（SaaS管理者側） | 型安全・動作確認 |
| 3 | SaaS管理者一覧画面（カテゴリ + 職種） | 追加・編集・削除が動作 |
| 4 | SaaS管理者職種詳細画面（スキル項目・レベル管理） | CRUD動作 |
| 5 | importFromGlobalTemplate Server Action | テナントDBへのコピー動作 |
| 6 | ImportFromTemplateModal（テナント側） | 取り込みが一覧に反映 |

---

## 関連ファイル

- [src/features/skill-map/actions.ts](../../../src/features/skill-map/actions.ts) — importFromGlobalTemplate を追加
- [src/features/skill-map/components/TenantSkillManager.tsx](../../../src/features/skill-map/components/TenantSkillManager.tsx) — 「テンプレートから取り込む」ボタン追加
- [src/config/routes.ts](../../../src/config/routes.ts) — SAAS.SKILL_TEMPLATES 追加
- [supabase/migrations/](../../../supabase/migrations/) — 新規マイグレーションファイル

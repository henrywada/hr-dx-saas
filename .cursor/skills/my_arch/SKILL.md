---
name: my_arch
description: >-
  hr-dx-saas のコアアーキテクチャを AI に理解させるプリフライトチェックリスト。
  開発セッション開始時に必ず読み込む。ルーティング・レイアウト・認証・データアクセスの
  基本的な仕組みを確認し、CLAUDE.md のルールと合わせて遵守する。
---

# hr-dx-saas アーキテクチャガイド（AIプリフライト）

このスキルを読み込んだら、以下を **声に出して確認** し、理解を示してから開発に進む。

---

## 1. 画面の種類とルーティング

hr-dx-saas には **3 種類のルートグループ** があり、URL に応じて異なるレイアウトが適用される。

```
src/app/
├── (tenant)/
│   ├── (tenant-users)/    → variant="portal"  白背景 (#F9FAFB)
│   │   └── top/page.tsx   ← 一般従業員 TOP（URL: /top）
│   └── (tenant-admin)/
│       └── adm/page.tsx   ← テナント管理者 TOP（URL: /adm）
│           layout.tsx     → variant="admin"   グリーン背景 (#f2f8f8)
└── (saas-admin)/
    └── saas_adm/page.tsx  ← SaaS管理者 TOP（URL: /saas_adm）
        layout.tsx         → variant="saas" + ロールガード
```

**ルートグループの () は URL に現れない。** `/top` は `(tenant)/(tenant-users)/top/` にある。

### 3 つの variant とその違い

| variant | 対象ユーザー | 背景色 | ロールガード |
|---------|------------|--------|------------|
| `"portal"` | 一般従業員 | 白 `#F9FAFB` | なし（middleware で認証済み） |
| `"admin"` | テナント管理者 | グリーン `#f2f8f8` | なし（ページ/クエリレベルで制御） |
| `"saas"` | SaaS管理者 | グリーン `#f2f8f8` | layout で `supaUser`/`developer` のみ許可 |

**新機能追加時、対象ユーザーに合ったルートグループに `page.tsx` を配置する。**

---

## 2. AppLayout と共通外枠

すべての認証済み画面は `AppLayout` で包まれる。

```tsx
// src/components/layout/AppLayout.tsx
<AppLayout variant="portal | admin | saas">
  {children}   ← ここに各 page.tsx の戻り値が入る
</AppLayout>
```

`AppLayout` 内部の構造:

```
AuthProvider（useAuth() フック用）
  TenantProvider（useTenant() フック用）
    MobileMenuProvider
      AppHeader(variant)     ← ヘッダー・ナビ
      AppSidebar(variant)    ← サイドバーメニュー
      <main>
        {children}           ← page.tsx の中身
      </main>
      Footer                 ← vX.Y.Z 表示
```

---

## 3. 認証とユーザー情報（getServerUser）

**すべての Server Component は `getServerUser()` でユーザーを取得する。**

```typescript
// src/lib/auth/server-user.ts
const user = await getServerUser()
// user が null → 未認証（middleware が /login にリダイレクト）
```

`getServerUser()` が返す `AppUser` 型:

| フィールド | 内容 | 用途例 |
|-----------|------|--------|
| `id` | auth.users の UUID | Supabase RLS |
| `role` | `'member'` / `'supaUser'` など | SaaS管理者判定 |
| `appRole` | `app_role.app_role` コード | 権限制御 |
| `appRoleName` | 日本語の役割名 | 画面表示 |
| `tenant_id` | テナント ID | RLS・データ取得 |
| `tenant_name` | テナント名 | 表示 |
| `employee_id` | `employees.id` | 紐付けクエリ |
| `division_id` | 所属部署 ID | 部署フィルタ |
| `is_manager` | 上長フラグ | 承認フロー |
| `planType` | `'free'` / `'pro'` / `'enterprise'` | プラン制御 |

---

## 4. データアクセスパターン（厳守）

```
page.tsx（Server Component）
  → src/features/[domain]/queries.ts    # SELECT のみ
  → 結果を Client Component に Props で渡す

Client Component
  → src/features/[domain]/actions.ts    # INSERT / UPDATE / DELETE
```

### queries.ts の書き方

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getSomethingList() {
  const supabase = await createClient()   // ← RLS 有効
  const { data, error } = await supabase
    .from('some_table')
    .select('*')
  if (error) throw error
  return data
}
```

### actions.ts の書き方

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'

export async function createSomething(input: Input) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('some_table').insert({ ...input })
  if (error) throw error

  revalidatePath('/adm/some-path')
}
```

### Supabase クライアントの使い分け

| クライアント | インポート元 | 用途 |
|-------------|------------|------|
| `createClient()` | `@/lib/supabase/server` | 一般ユーザー・管理者（RLS 有効） |
| `createClient()` | `@/lib/supabase/client` | ブラウザ用（RLS 有効） |
| `createAdminClient()` | `@/lib/supabase/admin` | SaaS管理者・バッチ専用（RLS バイパス） |

**⚠️ エンドユーザーが触れる actions.ts で `createAdminClient()` を絶対に使わない。**

---

## 5. 新機能の実装チェックリスト

```
□ src/config/routes.ts に APP_ROUTES 定数を追加したか
□ 正しいルートグループ（default/colored/saas-admin）に page.tsx を配置したか
□ features/[domain]/ に queries.ts / actions.ts / types.ts を作成したか
□ page.tsx の中で直接 supabase.from() を呼んでいないか
□ 新テーブルに RLS ポリシーを設定したか
□ URL をハードコードせず APP_ROUTES を使っているか
□ loading.tsx と error.tsx を配置したか
□ コードコメントは日本語で書いているか
```

---

## 6. 絶対禁止事項（要確認）

| 禁止 | 理由 |
|------|------|
| `supabase db reset` の実行 | ローカルデータ消滅 |
| エンドユーザー向け actions.ts で `createAdminClient()` | RLS バイパス・データ漏洩リスク |
| RLS なしの新テーブル | 他社データ漏洩の直接原因 |
| `app/api/` に不要なAPI Route | 外部連携以外は Server Actions に集約 |
| URL のハードコード | `APP_ROUTES` 定数を使う |
| `npx supabase` | グローバルインストール版の `supabase` を使う |

---

## 7. よく使う機能とその場所

| 機能 | feature ディレクトリ | 主なURL |
|------|--------------------|---------| 
| 勤怠・出退勤 | `attendance/`, `qr-punch/`, `telework/` | `/adm/attendance/` |
| 残業管理 | `overtime/` | `/adm/overtime-settings` |
| ストレスチェック | `stress-check/` | `/adm/high-stress` |
| eラーニング | `e-learning/` | `/adm/el-courses` |
| スキルマップ | `skill-map/`, `skill-portal/` | `/adm/skill-map` |
| 評価 | `evaluation/` | `/adm/evaluation` |
| アンケート | `survey/`, `questionnaire/` | `/adm/Survey` |
| 採用AI | `recruitment-ai/`, `job-postings/` | `/adm/(recurit)/` |
| テナント管理 | `tenant-management/` | `/saas_adm/tenants` |

---

## AI への確認事項

このスキルを読み込んだ後、以下を確認してから開発を始める：

1. **作業対象のページはどのルートグループに属するか？** （default / colored / saas-admin）
2. **対象ユーザーは誰か？** （一般従業員 / テナント管理者 / SaaS管理者）
3. **データ取得は queries.ts、書き込みは actions.ts に分離されているか？**
4. **新テーブルを作る場合、RLS ポリシーは設定したか？**

確認後、「アーキテクチャ確認完了。[作業内容] を開始します。」と宣言してから作業に入る。

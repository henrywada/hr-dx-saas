# グローバルスキルテンプレート実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SaaS管理者が業種別の職種テンプレート（職種・スキル項目・スキルレベル）を登録し、テナント管理者がワンクリックで自テナントDBにコピーできる機能を実装する。

**Architecture:** 専用グローバルテーブル（global_job_categories / global_job_roles / global_skill_items / global_skill_levels）を新設し、テナントテーブルとは完全分離。取り込み後は独立コピーで、グローバル側の更新は反映しない。SaaS管理者のみ書き込み可（アプリ層で user.role === 'supaUser' を確認）。

**Tech Stack:** Next.js 16 App Router、Supabase（PostgreSQL）、TypeScript (strict: false)、Tailwind CSS v4、React 19 useTransition

---

## ファイル構成

### 新規作成

| ファイル | 責務 |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_global_skill_templates.sql` | 4テーブル + インデックス |
| `src/features/global-skill-templates/types.ts` | GlobalJobCategory / GlobalJobRole / GlobalSkillItem / GlobalSkillLevel / GlobalJobRoleDetail 型 |
| `src/features/global-skill-templates/queries.ts` | SELECT専用（カテゴリ一覧・職種一覧・職種詳細） |
| `src/features/global-skill-templates/actions.ts` | SaaS管理者向けCRUD Server Actions |
| `src/features/global-skill-templates/components/GlobalJobCategoryManager.tsx` | 業種カテゴリ CRUD UI |
| `src/features/global-skill-templates/components/GlobalJobRoleList.tsx` | 職種カード一覧（カテゴリ別） |
| `src/features/global-skill-templates/components/GlobalJobRoleForm.tsx` | 職種 追加・編集フォーム |
| `src/features/global-skill-templates/components/GlobalSkillItemManager.tsx` | スキル項目 CRUD テーブル |
| `src/features/global-skill-templates/components/GlobalSkillLevelManager.tsx` | スキルレベル CRUD テーブル |
| `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/page.tsx` | 業種 + 職種一覧（Server Component） |
| `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/SkillTemplatesPageClient.tsx` | 一覧ページ Client Component |
| `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/loading.tsx` | ローディング |
| `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/page.tsx` | 職種詳細（Server Component） |
| `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/loading.tsx` | ローディング |
| `src/features/skill-map/components/ImportFromTemplateModal.tsx` | テンプレート取り込みモーダル |

### 既存変更

| ファイル | 変更内容 |
|---|---|
| `src/config/routes.ts` | SAAS.SKILL_TEMPLATES / SKILL_TEMPLATE_DETAIL 追加 |
| `src/features/skill-map/actions.ts` | importFromGlobalTemplate 追加 |
| `src/features/skill-map/components/TenantSkillManager.tsx` | templateCategories・templateRoles props追加、「テンプレートから取り込む」ボタン追加 |
| `src/features/skill-map/components/SkillMapTabs.tsx` | templateCategories・templateRoles props追加、TenantSkillManagerに渡す |
| `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` | getGlobalJobCategories・getGlobalJobRoles 取得追加 |

---

## Task 1: マイグレーション

**Files:**
- Create: `supabase/migrations/20260515000000_global_skill_templates.sql`

- [ ] **Step 1: マイグレーションファイルを作成**

```bash
supabase migration new global_skill_templates
```

期待出力: `Created new migration at supabase/migrations/20260515XXXXXX_global_skill_templates.sql`

- [ ] **Step 2: SQLを書く**

作成されたファイルに以下を書く：

```sql
-- 業種カテゴリ
CREATE TABLE public.global_job_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 職種マスタ
CREATE TABLE public.global_job_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.global_job_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スキル項目（職種ごと）
CREATE TABLE public.global_skill_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スキルレベル（職種ごと）
CREATE TABLE public.global_skill_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  criteria    TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#6b7280',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.global_job_roles (category_id);
CREATE INDEX ON public.global_skill_items (job_role_id);
CREATE INDEX ON public.global_skill_levels (job_role_id);
```

- [ ] **Step 3: マイグレーションを適用**

```bash
supabase migration up
```

期待出力: `Applying migration ...global_skill_templates.sql`

- [ ] **Step 4: テーブル確認**

```bash
supabase db execute --local "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'global_%' ORDER BY table_name;"
```

期待出力: `global_job_categories`, `global_job_roles`, `global_skill_items`, `global_skill_levels` の4行

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/
git commit -m "feat: グローバルスキルテンプレート DBマイグレーション追加"
```

---

## Task 2: routes.ts + types.ts

**Files:**
- Modify: `src/config/routes.ts`
- Create: `src/features/global-skill-templates/types.ts`

- [ ] **Step 1: routes.ts に定数追加**

`src/config/routes.ts` の `SAAS:` ブロック末尾（`EL_TEMPLATE_DETAIL` の後、`},` の前）に追加：

```typescript
    SKILL_TEMPLATES: '/saas_adm/skill-templates',
    SKILL_TEMPLATE_DETAIL: (roleId: string) => `/saas_adm/skill-templates/${roleId}`,
```

- [ ] **Step 2: 型ファイルを作成**

`src/features/global-skill-templates/types.ts` を新規作成：

```typescript
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
  category: string | null
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

- [ ] **Step 3: 型チェック**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/config/routes.ts src/features/global-skill-templates/types.ts
git commit -m "feat: グローバルスキルテンプレート 型定義・ルート定数追加"
```

---

## Task 3: queries.ts + actions.ts (SaaS管理者側)

**Files:**
- Create: `src/features/global-skill-templates/queries.ts`
- Create: `src/features/global-skill-templates/actions.ts`

- [ ] **Step 1: queries.ts を作成**

```typescript
// src/features/global-skill-templates/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GlobalJobCategory, GlobalJobRole, GlobalJobRoleDetail } from './types'

export async function getGlobalJobCategories(
  supabase: SupabaseClient
): Promise<GlobalJobCategory[]> {
  const { data, error } = await (supabase as any)
    .from('global_job_categories')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) return []
  return data ?? []
}

export async function getGlobalJobRoles(
  supabase: SupabaseClient,
  categoryId?: string
): Promise<GlobalJobRole[]> {
  let query = (supabase as any)
    .from('global_job_roles')
    .select('*, category:global_job_categories(name)')
    .order('sort_order')
    .order('created_at')
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data, error } = await query
  if (error) return []
  return (data ?? []).map((r: any) => ({
    ...r,
    category_name: r.category?.name ?? null,
    category: undefined,
  }))
}

export async function getGlobalJobRoleDetail(
  supabase: SupabaseClient,
  roleId: string
): Promise<GlobalJobRoleDetail | null> {
  const [roleRes, itemsRes, levelsRes] = await Promise.all([
    (supabase as any)
      .from('global_job_roles')
      .select('*, category:global_job_categories(name)')
      .eq('id', roleId)
      .single(),
    (supabase as any)
      .from('global_skill_items')
      .select('*')
      .eq('job_role_id', roleId)
      .order('sort_order')
      .order('created_at'),
    (supabase as any)
      .from('global_skill_levels')
      .select('*')
      .eq('job_role_id', roleId)
      .order('sort_order')
      .order('created_at'),
  ])
  if (roleRes.error || !roleRes.data) return null
  return {
    ...roleRes.data,
    category_name: roleRes.data.category?.name ?? null,
    category: undefined,
    skillItems: itemsRes.data ?? [],
    skillLevels: levelsRes.data ?? [],
  }
}
```

- [ ] **Step 2: actions.ts を作成**

```typescript
// src/features/global-skill-templates/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

type ActionResult = { success: true } | { success: false; error: string }

const TEMPLATES_PATH = APP_ROUTES.SAAS.SKILL_TEMPLATES
const HEX_RE = /^#[0-9a-fA-F]{6}$/

function isValidHex(hex: string | undefined): boolean {
  return !hex || HEX_RE.test(hex)
}

async function assertSaasAdmin() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

// ---- 業種カテゴリ ----

export async function createGlobalJobCategory(input: { name: string }): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('global_job_categories')
    .insert({ name: input.name })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalJobCategory(input: { id: string; name: string }): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('global_job_categories')
    .update({ name: input.name })
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalJobCategory(id: string): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_job_categories').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- 職種 ----

export async function createGlobalJobRole(input: {
  categoryId: string
  name: string
  description?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_job_roles').insert({
    category_id: input.categoryId,
    name: input.name,
    description: input.description ?? null,
    color_hex: input.colorHex ?? '#3b82f6',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalJobRole(input: {
  id: string
  name?: string
  description?: string | null
  colorHex?: string
  categoryId?: string
}): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('description' in input) updates.description = input.description
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  if (input.categoryId !== undefined) updates.category_id = input.categoryId
  const { error } = await (supabase as any).from('global_job_roles').update(updates).eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalJobRole(id: string): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_job_roles').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- スキル項目 ----

export async function createGlobalSkillItem(input: {
  jobRoleId: string
  name: string
  category?: string
}): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_items').insert({
    job_role_id: input.jobRoleId,
    name: input.name,
    category: input.category ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalSkillItem(input: {
  id: string
  name?: string
  category?: string | null
}): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('category' in input) updates.category = input.category
  const { error } = await (supabase as any).from('global_skill_items').update(updates).eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalSkillItem(id: string): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_items').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- スキルレベル ----

export async function createGlobalSkillLevel(input: {
  jobRoleId: string
  name: string
  criteria?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_levels').insert({
    job_role_id: input.jobRoleId,
    name: input.name,
    criteria: input.criteria ?? null,
    color_hex: input.colorHex ?? '#6b7280',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalSkillLevel(input: {
  id: string
  name?: string
  criteria?: string | null
  colorHex?: string
}): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('criteria' in input) updates.criteria = input.criteria
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  const { error } = await (supabase as any).from('global_skill_levels').update(updates).eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalSkillLevel(id: string): Promise<ActionResult> {
  const user = await assertSaasAdmin()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_levels').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}
```

- [ ] **Step 3: 型チェック**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/global-skill-templates/
git commit -m "feat: グローバルスキルテンプレート queries・actions追加"
```

---

## Task 4: SaaS管理者一覧画面コンポーネント

**Files:**
- Create: `src/features/global-skill-templates/components/GlobalJobCategoryManager.tsx`
- Create: `src/features/global-skill-templates/components/GlobalJobRoleList.tsx`
- Create: `src/features/global-skill-templates/components/GlobalJobRoleForm.tsx`

- [ ] **Step 1: GlobalJobCategoryManager.tsx を作成**

```typescript
// src/features/global-skill-templates/components/GlobalJobCategoryManager.tsx
'use client'

import { useState, useTransition } from 'react'
import type { GlobalJobCategory } from '../types'
import {
  createGlobalJobCategory,
  updateGlobalJobCategory,
  deleteGlobalJobCategory,
} from '../actions'

type Props = {
  categories: GlobalJobCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function GlobalJobCategoryManager({ categories, selectedId, onSelect }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createGlobalJobCategory({ name: newName.trim() })
      if ('error' in res) { setError(res.error); return }
      setNewName('')
      setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalJobCategory({ id: editId, name: editName.trim() })
      if ('error' in res) { setError(res.error); return }
      setEditId(null)
      setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('この業種カテゴリを削除しますか？配下の職種もすべて削除されます。')) return
    startTransition(async () => {
      const res = await deleteGlobalJobCategory(id)
      if ('error' in res) { setError(res.error); return }
      if (selectedId === id) onSelect(null)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">業種カテゴリ</h3>
      {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="業種名（例：IT）"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
        />
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          追加
        </button>
      </div>

      <div className="space-y-1">
        {categories.map(cat => (
          <div key={cat.id}>
            {editId === cat.id ? (
              <div className="flex gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                />
                <button onClick={handleUpdate} disabled={isPending} className="text-xs text-primary font-medium">保存</button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-500">×</button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 px-3 py-2 rounded cursor-pointer text-sm ${selectedId === cat.id ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
              >
                <span className="flex-1">{cat.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); setEditId(cat.id); setEditName(cat.name) }}
                  className={`text-xs ${selectedId === cat.id ? 'text-white/70' : 'text-gray-400 hover:text-primary'}`}
                >
                  編集
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(cat.id) }}
                  className={`text-xs ${selectedId === cat.id ? 'text-white/70' : 'text-gray-400 hover:text-red-500'}`}
                >
                  削除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: GlobalJobRoleForm.tsx を作成**

```typescript
// src/features/global-skill-templates/components/GlobalJobRoleForm.tsx
'use client'

import { useState, useTransition } from 'react'
import type { GlobalJobCategory } from '../types'
import { createGlobalJobRole } from '../actions'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

type Props = {
  categories: GlobalJobCategory[]
  defaultCategoryId?: string
  onClose: () => void
}

export function GlobalJobRoleForm({ categories, defaultCategoryId, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [colorHex, setColorHex] = useState('#3b82f6')
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? categories[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!name.trim() || !categoryId) return
    startTransition(async () => {
      const res = await createGlobalJobRole({
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        colorHex,
      })
      if ('error' in res) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">職種を追加</h2>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">業種カテゴリ</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">職種名 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: プログラマー"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">説明（任意）</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例: Webシステムの設計・開発を担当"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カラー</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColorHex(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: colorHex === c ? '#374151' : 'transparent' }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="flex-1 bg-primary text-white py-2 rounded text-sm disabled:opacity-50"
          >
            追加
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: GlobalJobRoleList.tsx を作成**

```typescript
// src/features/global-skill-templates/components/GlobalJobRoleList.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GlobalJobRole, GlobalJobCategory } from '../types'
import { deleteGlobalJobRole } from '../actions'
import { GlobalJobRoleForm } from './GlobalJobRoleForm'
import { APP_ROUTES } from '@/config/routes'

type Props = {
  roles: GlobalJobRole[]
  categories: GlobalJobCategory[]
  selectedCategoryId: string | null
}

export function GlobalJobRoleList({ roles, categories, selectedCategoryId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = selectedCategoryId
    ? roles.filter(r => r.category_id === selectedCategoryId)
    : roles

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？スキル項目・スキルレベルもすべて削除されます。`)) return
    startTransition(async () => {
      const res = await deleteGlobalJobRole(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          職種一覧{selectedCategoryId && (
            <span className="text-gray-400 font-normal ml-1">
              — {categories.find(c => c.id === selectedCategoryId)?.name}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm"
        >
          ＋ 職種を追加
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">職種がありません</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(role => (
            <div
              key={role.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => router.push(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(role.id))}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: role.color_hex + '33',
                    color: role.color_hex,
                    border: `1px solid ${role.color_hex}88`,
                  }}
                >
                  {role.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(role.id, role.name) }}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                >
                  削除
                </button>
              </div>
              {role.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{role.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">{role.category_name}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GlobalJobRoleForm
          categories={categories}
          defaultCategoryId={selectedCategoryId ?? undefined}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 型チェック**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/features/global-skill-templates/components/
git commit -m "feat: グローバルスキルテンプレート 一覧コンポーネント追加"
```

---

## Task 5: SaaS管理者一覧ページ

**Files:**
- Create: `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/page.tsx`
- Create: `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/SkillTemplatesPageClient.tsx`
- Create: `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/loading.tsx`

- [ ] **Step 1: page.tsx を作成**

```typescript
// src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getGlobalJobCategories, getGlobalJobRoles } from '@/features/global-skill-templates/queries'
import { SkillTemplatesPageClient } from './SkillTemplatesPageClient'

export const dynamic = 'force-dynamic'

export default async function SkillTemplatesPage() {
  const supabase = await createClient()
  const [categories, roles] = await Promise.all([
    getGlobalJobCategories(supabase),
    getGlobalJobRoles(supabase),
  ])

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">スキルテンプレート管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            全テナントが参照できる職種・スキル項目・スキルレベルのテンプレートを管理します
          </p>
        </div>
        <SkillTemplatesPageClient categories={categories} roles={roles} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: SkillTemplatesPageClient.tsx を作成**

```typescript
// src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/SkillTemplatesPageClient.tsx
'use client'

import { useState } from 'react'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { GlobalJobCategoryManager } from '@/features/global-skill-templates/components/GlobalJobCategoryManager'
import { GlobalJobRoleList } from '@/features/global-skill-templates/components/GlobalJobRoleList'

type Props = {
  categories: GlobalJobCategory[]
  roles: GlobalJobRole[]
}

export function SkillTemplatesPageClient({ categories, roles }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <GlobalJobCategoryManager
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </div>
      <div className="flex-1 min-w-0">
        <GlobalJobRoleList
          roles={roles}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: loading.tsx を作成**

```typescript
// src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/loading.tsx
export default function Loading() {
  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="flex gap-6">
          <div className="w-56 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />)}
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: 型チェック**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 5: コミット**

```bash
git add "src/app/(saas-admin)/saas_adm/(skill_templates)/"
git commit -m "feat: グローバルスキルテンプレート SaaS管理者一覧ページ追加"
```

---

## Task 6: 職種詳細画面コンポーネント + ページ

**Files:**
- Create: `src/features/global-skill-templates/components/GlobalSkillItemManager.tsx`
- Create: `src/features/global-skill-templates/components/GlobalSkillLevelManager.tsx`
- Create: `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/page.tsx`
- Create: `src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/loading.tsx`

- [ ] **Step 1: GlobalSkillItemManager.tsx を作成**

```typescript
// src/features/global-skill-templates/components/GlobalSkillItemManager.tsx
'use client'

import { useState, useTransition } from 'react'
import type { GlobalSkillItem } from '../types'
import { createGlobalSkillItem, updateGlobalSkillItem, deleteGlobalSkillItem } from '../actions'

const CATEGORIES = ['技術', '知識', '資格', '経験'] as const

type Props = { jobRoleId: string; items: GlobalSkillItem[] }

export function GlobalSkillItemManager({ jobRoleId, items }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillItem({
        jobRoleId,
        name: newName.trim(),
        category: newCategory || undefined,
      })
      if ('error' in res) { setError(res.error); return }
      setNewName(''); setNewCategory(''); setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillItem({
        id: editId,
        name: editName.trim(),
        category: editCategory || null,
      })
      if ('error' in res) { setError(res.error); return }
      setEditId(null); setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('このスキル項目を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteGlobalSkillItem(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">スキル項目</h3>
      {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="スキル名（例：Python）"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-[140px]"
        />
        <select
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">カテゴリ（任意）</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          追加
        </button>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-700">スキル名</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">カテゴリ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs">未登録</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                {editId === item.id ? (
                  <>
                    <td className="px-2 py-1.5">
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="">—</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={handleUpdate} disabled={isPending} className="text-xs text-primary font-medium mr-2">保存</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-gray-500">×</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-gray-500">{item.category ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => { setEditId(item.id); setEditName(item.name); setEditCategory(item.category ?? '') }} className="text-xs text-gray-400 hover:text-primary mr-2">編集</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-400 hover:text-red-500">削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: GlobalSkillLevelManager.tsx を作成**

```typescript
// src/features/global-skill-templates/components/GlobalSkillLevelManager.tsx
'use client'

import { useState, useTransition } from 'react'
import type { GlobalSkillLevel } from '../types'
import { createGlobalSkillLevel, updateGlobalSkillLevel, deleteGlobalSkillLevel } from '../actions'

const COLORS = ['#6b7280','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6']

type Props = { jobRoleId: string; levels: GlobalSkillLevel[] }

export function GlobalSkillLevelManager({ jobRoleId, levels }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newCriteria, setNewCriteria] = useState('')
  const [newColor, setNewColor] = useState('#6b7280')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCriteria, setEditCriteria] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillLevel({
        jobRoleId,
        name: newName.trim(),
        criteria: newCriteria.trim() || undefined,
        colorHex: newColor,
      })
      if ('error' in res) { setError(res.error); return }
      setNewName(''); setNewCriteria(''); setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillLevel({
        id: editId,
        name: editName.trim(),
        criteria: editCriteria.trim() || null,
        colorHex: editColor,
      })
      if ('error' in res) { setError(res.error); return }
      setEditId(null); setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('このスキルレベルを削除しますか？')) return
    startTransition(async () => {
      const res = await deleteGlobalSkillLevel(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">スキルレベル</h3>
      {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</p>}

      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="レベル名（例：初級）"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
        />
        <input
          type="text"
          value={newCriteria}
          onChange={e => setNewCriteria(e.target.value)}
          placeholder="達成基準（例：経験3年以上）"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-[160px]"
        />
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{ backgroundColor: c, borderColor: newColor === c ? '#374151' : 'transparent' }}
            />
          ))}
        </div>
        <button onClick={handleCreate} disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
          追加
        </button>
      </div>

      <div className="space-y-2">
        {levels.map(level => (
          <div key={level.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded">
            {editId === level.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-28" />
                <input value={editCriteria} onChange={e => setEditCriteria(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm flex-1" />
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditColor(c)}
                      className="w-5 h-5 rounded-full border-2"
                      style={{ backgroundColor: c, borderColor: editColor === c ? '#374151' : 'transparent' }}
                    />
                  ))}
                </div>
                <button onClick={handleUpdate} disabled={isPending} className="text-xs text-primary font-medium">保存</button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-500">×</button>
              </>
            ) : (
              <>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: level.color_hex + '33', color: level.color_hex }}>
                  {level.name}
                </span>
                <span className="text-xs text-gray-500 flex-1">{level.criteria ?? '—'}</span>
                <button onClick={() => { setEditId(level.id); setEditName(level.name); setEditCriteria(level.criteria ?? ''); setEditColor(level.color_hex) }}
                  className="text-xs text-gray-400 hover:text-primary">編集</button>
                <button onClick={() => handleDelete(level.id)} className="text-xs text-gray-400 hover:text-red-500">削除</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 職種詳細ページを作成**

```typescript
// src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getGlobalJobRoleDetail } from '@/features/global-skill-templates/queries'
import { GlobalSkillItemManager } from '@/features/global-skill-templates/components/GlobalSkillItemManager'
import { GlobalSkillLevelManager } from '@/features/global-skill-templates/components/GlobalSkillLevelManager'
import { APP_ROUTES } from '@/config/routes'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SkillTemplateDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params
  const supabase = await createClient()
  const role = await getGlobalJobRoleDetail(supabase, roleId)
  if (!role) notFound()

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 max-w-3xl">
        <div className="mb-6">
          <Link href={APP_ROUTES.SAAS.SKILL_TEMPLATES} className="text-sm text-gray-400 hover:text-primary">
            ← スキルテンプレート一覧
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-base font-semibold"
              style={{ backgroundColor: role.color_hex + '33', color: role.color_hex }}
            >
              {role.name}
            </span>
            <span className="text-sm text-gray-400">{role.category_name}</span>
          </div>
          {role.description && <p className="text-sm text-gray-500 mt-1">{role.description}</p>}
        </div>

        <div className="space-y-8">
          <GlobalSkillItemManager jobRoleId={role.id} items={role.skillItems} />
          <GlobalSkillLevelManager jobRoleId={role.id} levels={role.skillLevels} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: loading.tsx を作成**

```typescript
// src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/loading.tsx
export default function Loading() {
  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 max-w-3xl">
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: 型チェック**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/global-skill-templates/components/ "src/app/(saas-admin)/saas_adm/(skill_templates)/skill-templates/[roleId]/"
git commit -m "feat: グローバルスキルテンプレート 職種詳細画面追加"
```

---

## Task 7: テナント取り込み機能

**Files:**
- Modify: `src/features/skill-map/actions.ts`
- Create: `src/features/skill-map/components/ImportFromTemplateModal.tsx`
- Modify: `src/features/skill-map/components/TenantSkillManager.tsx`
- Modify: `src/features/skill-map/components/SkillMapTabs.tsx`
- Modify: `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx`

- [ ] **Step 1: importFromGlobalTemplate を actions.ts 末尾に追加**

`src/features/skill-map/actions.ts` の末尾に追加（既存コードはそのまま）：

```typescript
// ---- グローバルテンプレートから取り込み ----

export async function importFromGlobalTemplate(jobRoleId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const [roleRes, itemsRes, levelsRes] = await Promise.all([
    (supabase as any).from('global_job_roles').select('name, color_hex').eq('id', jobRoleId).single(),
    (supabase as any).from('global_skill_items').select('name, category').eq('job_role_id', jobRoleId).order('sort_order'),
    (supabase as any).from('global_skill_levels').select('name, criteria, color_hex').eq('job_role_id', jobRoleId).order('sort_order'),
  ])

  if (roleRes.error || !roleRes.data) return { success: false, error: 'テンプレートが見つかりません' }

  const { data: skillData, error: skillError } = await (supabase as any)
    .from('tenant_skills')
    .insert({
      tenant_id: user.tenant_id,
      name: roleRes.data.name,
      color_hex: roleRes.data.color_hex,
    })
    .select('id')
    .single()
  if (skillError) return { success: false, error: skillError.message }

  const tenantSkillId = skillData.id

  if (itemsRes.data && itemsRes.data.length > 0) {
    const requirementsRows = itemsRes.data.map((item: any) => ({
      tenant_id: user.tenant_id,
      skill_id: tenantSkillId,
      name: item.name,
      category: item.category ?? null,
    }))
    const { error: reqError } = await (supabase as any).from('skill_requirements').insert(requirementsRows)
    if (reqError) return { success: false, error: reqError.message }
  }

  if (levelsRes.data && levelsRes.data.length > 0) {
    const levelsRows = levelsRes.data.map((level: any) => ({
      tenant_id: user.tenant_id,
      name: level.name,
      color_hex: level.color_hex,
    }))
    const { error: levelError } = await (supabase as any).from('skill_levels').insert(levelsRows)
    if (levelError) return { success: false, error: levelError.message }
  }

  revalidatePath(SKILL_MAP_PATH)
  return { success: true }
}
```

- [ ] **Step 2: ImportFromTemplateModal.tsx を作成**

```typescript
// src/features/skill-map/components/ImportFromTemplateModal.tsx
'use client'

import { useState, useTransition } from 'react'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { importFromGlobalTemplate } from '../actions'

type Props = {
  categories: GlobalJobCategory[]
  roles: GlobalJobRole[]
  onClose: () => void
}

export function ImportFromTemplateModal({ categories, roles, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const filtered = selectedCategoryId
    ? roles.filter(r => r.category_id === selectedCategoryId)
    : roles

  function handleImport(roleId: string) {
    startTransition(async () => {
      const res = await importFromGlobalTemplate(roleId)
      if ('error' in res) { setError(res.error); return }
      setImportedIds(prev => new Set([...prev, roleId]))
      setError(null)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">テンプレートから取り込む</h2>
            <p className="text-sm text-gray-500">職種を選んで自テナントの技能マスタにコピーします</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex gap-2 px-5 py-3 border-b flex-wrap">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${!selectedCategoryId ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            すべて
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedCategoryId === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">テンプレートがありません</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(role => {
                const isImported = importedIds.has(role.id)
                return (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium"
                        style={{ backgroundColor: role.color_hex + '33', color: role.color_hex, border: `1px solid ${role.color_hex}88` }}
                      >
                        {role.name}
                      </span>
                      {isImported && <span className="text-xs text-green-600 font-medium">✓ 取り込み済み</span>}
                    </div>
                    {role.description && <p className="text-xs text-gray-500">{role.description}</p>}
                    <p className="text-xs text-gray-400">{role.category_name}</p>
                    <button
                      onClick={() => handleImport(role.id)}
                      disabled={isPending}
                      className="w-full border border-primary text-primary py-1.5 rounded text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                    >
                      {isImported ? '再度取り込む' : '取り込む'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t">
          <button onClick={onClose} className="w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TenantSkillManager.tsx を更新**

`src/features/skill-map/components/TenantSkillManager.tsx` に以下の変更を加える：

ファイル冒頭のimportに追加：
```typescript
import { ImportFromTemplateModal } from './ImportFromTemplateModal'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
```

Props型を変更（`type Props = { skills: TenantSkill[] }` を下記に置き換え）：
```typescript
type Props = {
  skills: TenantSkill[]
  templateCategories: GlobalJobCategory[]
  templateRoles: GlobalJobRole[]
}
```

コンポーネント引数を変更：
```typescript
export function TenantSkillManager({ skills, templateCategories, templateRoles }: Props) {
```

`const [error, setError] = useState<string | null>(null)` の後に追加：
```typescript
  const [showImport, setShowImport] = useState(false)
```

`<h3 className="text-sm font-semibold text-gray-700">技能マスタ管理</h3>` の後に追加：
```typescript
      <button
        onClick={() => setShowImport(true)}
        className="text-xs text-primary border border-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors"
      >
        📥 テンプレートから取り込む
      </button>
```

コンポーネントの最後の `</div>` の前（`</div>` が2つある最後）に追加：
```typescript
      {showImport && (
        <ImportFromTemplateModal
          categories={templateCategories}
          roles={templateRoles}
          onClose={() => setShowImport(false)}
        />
      )}
```

- [ ] **Step 4: SkillMapTabs.tsx を更新**

現在の `SkillMapTabs.tsx` を確認：
```bash
grep -n "TenantSkillManager\|Props\|templateCategories" src/features/skill-map/components/SkillMapTabs.tsx | head -20
```

Props型にフィールドを追加し、TenantSkillManagerに props を渡す。SkillMapTabs の Props に以下を追加：
```typescript
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'

// Props型に追加:
  templateCategories: GlobalJobCategory[]
  templateRoles: GlobalJobRole[]
```

TenantSkillManager の呼び出し箇所を更新：
```typescript
<TenantSkillManager
  skills={skills}
  templateCategories={templateCategories}
  templateRoles={templateRoles}
/>
```

- [ ] **Step 5: skill-map/page.tsx を更新**

`src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` を確認：
```bash
cat "src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx"
```

import に追加：
```typescript
import { getGlobalJobCategories, getGlobalJobRoles } from '@/features/global-skill-templates/queries'
```

Promise.all を拡張（既存の getTenantSkills, getEmployeeSkillRows, getSkillGroupRows に追加）：
```typescript
const [skills, employeeRows, groupRows, templateCategories, templateRoles] = await Promise.all([
  getTenantSkills(supabase),
  getEmployeeSkillRows(supabase),
  getSkillGroupRows(supabase),
  getGlobalJobCategories(supabase),
  getGlobalJobRoles(supabase),
])
```

SkillMapTabs に props を追加：
```typescript
<SkillMapTabs
  // 既存props はそのまま
  templateCategories={templateCategories}
  templateRoles={templateRoles}
/>
```

- [ ] **Step 6: 型チェック**

```bash
npm run type-check 2>&1 | head -30
```

期待出力: エラーなし

- [ ] **Step 7: コミット**

```bash
git add src/features/skill-map/ "src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx"
git commit -m "feat: グローバルスキルテンプレート テナント取り込み機能追加"
```

---

## Task 8: 最終ビルド確認

- [ ] **Step 1: ビルド実行**

```bash
npm run build 2>&1 | tail -30
```

期待出力: `✓ Compiled successfully` またはエラーなし

- [ ] **Step 2: 型チェック最終確認**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "feat: グローバルスキルテンプレート機能 完成 (#global-skill-templates)"
```

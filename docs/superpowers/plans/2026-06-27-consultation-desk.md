# 悩み・相談窓口（Consultation Desk）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 従業員が匿名/記名で相談を送信し、人事・産業医が受付・対応・返信できる相談窓口機能をMVPスコープで実装する。

**Architecture:** Next.js App Router の既存パターン（`page.tsx` → `features/[domain]/queries.ts` で読み取り、Client Component → `actions.ts` の Server Actions で書き込み）に従う。新規テーブル `consultations` / `consultation_replies` を Supabase に追加し、`current_tenant_id()` / `current_employee_app_role()` ヘルパー関数を使った RLS でテナント分離と役割制御を行う。匿名性は表示層のみで実現し、データは常に本人特定可能な状態で保持する。

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript 5 (strict: false) / Supabase (PostgreSQL + RLS) / Zod v4 / `node:test`（`./node_modules/.bin/tsx --test` で実行）

## Global Constraints

- パスエイリアス `@/*` → `./src/*`
- DBカラムは snake_case、TypeScript識別子は camelCase/PascalCase
- コードコメントは日本語
- `page.tsx` 内に `supabase.from(...)` を直接書かない。`queries.ts` はSELECTのみ、`actions.ts` はServer Actionsで書き込みのみ
- 新規テーブルは必ずRLS（テナント分離）を設定。`createAdminClient()` はエンドユーザー向け `actions.ts` 内では使用しない
- データ取得が発生するルートには `loading.tsx` と `error.tsx` を配置
- Supabaseへの日時書き込みは `Asia/Tokyo` タイムゾーン基準
- URLは `APP_ROUTES` 定数経由でのみ参照（ハードコード禁止）
- テスト実行: `./node_modules/.bin/tsx --test <ファイルパス>`（このプロジェクトに `npm test` スクリプトは無い。`node:test` をtsxローダー経由で直接実行する）

---

### Task 1: DBマイグレーション（テーブル・RLS）

**Files:**

- Create: `supabase/migrations/<timestamp>_add_consultation_desk.sql`（タイムスタンプは `supabase migration new` が自動付与）

**Interfaces:**

- Produces: テーブル `public.consultations`（列: `id, tenant_id, employee_id, is_anonymous, category, body, status, assigned_to, created_at`）、`public.consultation_replies`（列: `id, consultation_id, author_employee_id, is_staff_reply, body, created_at`）。以降のタスクはこの列名・型をそのまま使う。

- [ ] **Step 1: マイグレーションファイルを作成**

```bash
supabase migration new add_consultation_desk
```

- [ ] **Step 2: マイグレーション内容を記述**

作成された `supabase/migrations/<timestamp>_add_consultation_desk.sql` に以下を記述する：

```sql
-- 悩み・相談窓口（Consultation Desk）
-- 匿名性は表示層のみで実現する。employee_id は匿名相談でも常に保存し、
-- 対応者向けUIで is_anonymous=true の場合に氏名解決をスキップする方針（設計: docs/superpowers/specs/2026-06-27-consultation-desk-design.md）。

CREATE TYPE consultation_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE consultation_category AS ENUM ('harassment', 'mental_health', 'workload', 'interpersonal', 'other');

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  category consultation_category NOT NULL,
  body TEXT NOT NULL,
  status consultation_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.consultation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  author_employee_id UUID NOT NULL REFERENCES public.employees(id),
  is_staff_reply BOOLEAN NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultations_tenant_employee ON public.consultations (tenant_id, employee_id);
CREATE INDEX idx_consultation_replies_consultation_id ON public.consultation_replies (consultation_id);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select_self" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "consultations_select_staff" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );

CREATE POLICY "consultations_insert_self" ON public.consultations
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "consultations_update_staff" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );

CREATE POLICY "consultation_replies_select" ON public.consultation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (
          c.employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
          OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
        )
    )
  );

CREATE POLICY "consultation_replies_insert" ON public.consultation_replies
  FOR INSERT WITH CHECK (
    author_employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (
          c.employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
          OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
        )
    )
  );
```

- [ ] **Step 3: マイグレーションを適用**

```bash
supabase migration up
```

Expected: `add_consultation_desk` が適用済み一覧に表示され、エラーが出ない。

- [ ] **Step 4: RLSを手動検証**

ローカル Studio（`http://127.0.0.1:55423`）の SQL Editor で、一般従業員ロールのJWTをセットして自分以外の `employee_id` を持つ行が見えないこと、`hr`/`company_doctor`系ロールでは全テナント内の行が見えることを確認する（このプロジェクトには自動RLS統合テストの基盤が無いため、現状の規約に合わせて手動検証とする）。

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add consultations and consultation_replies tables with RLS"
```

---

### Task 2: 型定義

**Files:**

- Create: `src/features/consultation/types.ts`

**Interfaces:**

- Consumes: Task 1 のテーブル列名
- Produces: `ConsultationCategory`, `ConsultationStatus`, `Consultation`, `ConsultationReply`, `ConsultationListItem`, `ConsultationQueueItem`, `ConsultationThread`（Task 3, 4, 6, 7 が使用）

- [ ] **Step 1: 型ファイルを作成**

```typescript
// src/features/consultation/types.ts

export type ConsultationCategory =
  | 'harassment'
  | 'mental_health'
  | 'workload'
  | 'interpersonal'
  | 'other'

export type ConsultationStatus = 'open' | 'in_progress' | 'resolved'

export interface Consultation {
  id: string
  tenant_id: string
  employee_id: string
  is_anonymous: boolean
  category: ConsultationCategory
  body: string
  status: ConsultationStatus
  assigned_to: string | null
  created_at: string
}

export interface ConsultationReply {
  id: string
  consultation_id: string
  author_employee_id: string
  is_staff_reply: boolean
  body: string
  created_at: string
}

/** 本人向け一覧の1行 */
export interface ConsultationListItem {
  id: string
  category: ConsultationCategory
  status: ConsultationStatus
  created_at: string
}

/** 対応者向けキューの1行。display_name は匿名時のマスク後の表示名 */
export interface ConsultationQueueItem {
  id: string
  category: ConsultationCategory
  status: ConsultationStatus
  is_anonymous: boolean
  employee_name: string | null
  display_name: string
  created_at: string
}

export interface ConsultationThread {
  consultation: Consultation
  replies: ConsultationReply[]
}
```

- [ ] **Step 2: 型チェックを実行**

Run: `npm run type-check`
Expected: `src/features/consultation/types.ts` に関するエラーが出ない（他の未実装ファイルのエラーは後続タスクで解消されるため無視してよい）。

- [ ] **Step 3: Commit**

```bash
git add src/features/consultation/types.ts
git commit -m "feat: add consultation domain types"
```

---

### Task 3: queries.ts（読み取り・匿名マスク純粋関数）

**Files:**

- Create: `src/features/consultation/queries.ts`
- Test: `src/features/consultation/queries.test.ts`

**Interfaces:**

- Consumes: Task 2 の `ConsultationListItem`, `ConsultationQueueItem`, `ConsultationThread`
- Produces: `maskAnonymousAuthor(rows)`, `getMyConsultations(employeeId: string): Promise<ConsultationListItem[]>`, `getConsultationThread(consultationId: string, viewerEmployeeId: string, isStaff: boolean): Promise<ConsultationThread | null>`, `getConsultationQueue(): Promise<ConsultationQueueItem[]>`（Task 6, 7 が使用）

- [ ] **Step 1: 匿名マスク純粋関数の失敗テストを書く**

```typescript
// src/features/consultation/queries.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { maskAnonymousAuthor } from './queries'

test('匿名の場合は氏名を伏せて「匿名相談者」になる', () => {
  const rows = [{ id: 'c1', is_anonymous: true, employee_name: '山田太郎' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].display_name, '匿名相談者')
})

test('記名の場合は氏名がそのまま表示される', () => {
  const rows = [{ id: 'c2', is_anonymous: false, employee_name: '佐藤花子' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].display_name, '佐藤花子')
})

test('元の行の他フィールドは保持される', () => {
  const rows = [{ id: 'c3', is_anonymous: false, employee_name: '鈴木一郎', status: 'open' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].status, 'open')
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `./node_modules/.bin/tsx --test src/features/consultation/queries.test.ts`
Expected: FAIL（`queries.ts` がまだ存在しない / `maskAnonymousAuthor` が未定義）

- [ ] **Step 3: queries.ts を実装**

```typescript
// src/features/consultation/queries.ts
import { createClient } from '@/lib/supabase/server'
import type { ConsultationListItem, ConsultationQueueItem, ConsultationThread } from './types'

/**
 * 匿名相談（is_anonymous=true）の場合、対応者向け表示名を「匿名相談者」に置き換える。
 * データ自体（employee_id）は変更しない。表示層専用の純粋関数。
 */
export function maskAnonymousAuthor<
  T extends { is_anonymous: boolean; employee_name?: string | null },
>(rows: T[]): (T & { display_name: string })[] {
  return rows.map(row => ({
    ...row,
    display_name: row.is_anonymous ? '匿名相談者' : (row.employee_name ?? '不明'),
  }))
}

export async function getMyConsultations(employeeId: string): Promise<ConsultationListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, category, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyConsultations error:', error)
    return []
  }
  return data || []
}

export async function getConsultationThread(
  consultationId: string,
  viewerEmployeeId: string,
  isStaff: boolean
): Promise<ConsultationThread | null> {
  const supabase = await createClient()

  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .maybeSingle()

  if (consultationError || !consultation) {
    if (consultationError) console.error('getConsultationThread error:', consultationError)
    return null
  }

  if (!isStaff && consultation.employee_id !== viewerEmployeeId) {
    return null
  }

  const { data: replies, error: repliesError } = await supabase
    .from('consultation_replies')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true })

  if (repliesError) {
    console.error('getConsultationThread replies error:', repliesError)
    return { consultation, replies: [] }
  }

  return { consultation, replies: replies || [] }
}

export async function getConsultationQueue(): Promise<ConsultationQueueItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, category, status, is_anonymous, created_at, employees:employee_id(name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getConsultationQueue error:', error)
    return []
  }

  const rows = (data || []).map(row => ({
    id: row.id,
    category: row.category,
    status: row.status,
    is_anonymous: row.is_anonymous,
    created_at: row.created_at,
    employee_name: (row.employees as { name?: string } | null)?.name ?? null,
  }))

  return maskAnonymousAuthor(rows)
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `./node_modules/.bin/tsx --test src/features/consultation/queries.test.ts`
Expected: `tests 3`, `pass 3`, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/features/consultation/queries.ts src/features/consultation/queries.test.ts
git commit -m "feat: add consultation queries with anonymous display masking"
```

---

### Task 4: actions.ts（書き込み・Zodバリデーション）

**Files:**

- Create: `src/features/consultation/actions.ts`
- Test: `src/features/consultation/actions.test.ts`

**Interfaces:**

- Consumes: Task 2 の `ConsultationCategory`
- Produces: `submitConsultationSchema`, `submitConsultation(input)`, `replyToConsultation(input)`, `updateConsultationStatus(consultationId, status)`（Task 6 のコンポーネントが呼び出す）

- [ ] **Step 1: Zodスキーマ境界値の失敗テストを書く**

```typescript
// src/features/consultation/actions.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { submitConsultationSchema } from './actions'

test('正常な入力はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '相談内容のテキストです',
    isAnonymous: true,
  })
  assert.equal(result.success, true)
})

test('空文字のbodyは拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'other',
    body: '',
    isAnonymous: false,
  })
  assert.equal(result.success, false)
})

test('2000文字を超えるbodyは拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'other',
    body: 'あ'.repeat(2001),
    isAnonymous: false,
  })
  assert.equal(result.success, false)
})

test('不正なcategoryは拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'invalid_category',
    body: '本文',
    isAnonymous: false,
  })
  assert.equal(result.success, false)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `./node_modules/.bin/tsx --test src/features/consultation/actions.test.ts`
Expected: FAIL（`actions.ts` が未作成）

- [ ] **Step 3: actions.ts を実装**

```typescript
// src/features/consultation/actions.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export const submitConsultationSchema = z.object({
  category: z.enum(['harassment', 'mental_health', 'workload', 'interpersonal', 'other']),
  body: z.string().min(1).max(2000),
  isAnonymous: z.boolean(),
})

export type SubmitConsultationInput = z.infer<typeof submitConsultationSchema>

export async function submitConsultation(input: SubmitConsultationInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = submitConsultationSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      tenant_id: user.tenant_id,
      employee_id: user.employee_id,
      category: parsed.category,
      body: parsed.body,
      is_anonymous: parsed.isAnonymous,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.CONSULTATION)
  return { id: data.id }
}

const replySchema = z.object({
  consultationId: z.string().uuid(),
  body: z.string().min(1).max(2000),
})

export async function replyToConsultation(input: z.infer<typeof replySchema>): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = replySchema.parse(input)
  const supabase = await createClient()
  const isStaff = STAFF_ROLES.includes(user.appRole ?? '')

  const { error } = await supabase.from('consultation_replies').insert({
    consultation_id: parsed.consultationId,
    author_employee_id: user.employee_id,
    body: parsed.body,
    is_staff_reply: isStaff,
  })

  if (error) throw error

  revalidatePath(`${APP_ROUTES.TENANT.CONSULTATION}/${parsed.consultationId}`)
}

const updateStatusSchema = z.object({
  consultationId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved']),
})

export async function updateConsultationStatus(
  input: z.infer<typeof updateStatusSchema>
): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!STAFF_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')

  const parsed = updateStatusSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('consultations')
    .update({ status: parsed.status })
    .eq('id', parsed.consultationId)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `./node_modules/.bin/tsx --test src/features/consultation/actions.test.ts`
Expected: `tests 4`, `pass 4`, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/features/consultation/actions.ts src/features/consultation/actions.test.ts
git commit -m "feat: add consultation server actions with zod validation"
```

---

### Task 5: ルート定義・メニューマスタ登録

**Files:**

- Modify: `src/config/routes.ts`
- Create: `supabase/migrations/<timestamp>_add_consultation_service_master.sql`

**Interfaces:**

- Produces: `APP_ROUTES.TENANT.CONSULTATION`, `APP_ROUTES.TENANT.CONSULTATION_DETAIL(id)`, `APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE`, `APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(id)`（Task 4で参照済み、Task 6/7が使用）

- [ ] **Step 1: routes.ts に追記**

`src/config/routes.ts` の `TENANT` オブジェクト内（既存 `PORTAL_DEVICE_PAIRING` の付近）に追加。このプロジェクトの既存命名規則は `TENANT.ADMIN_*`（フラット、ネストしない）なので、それに合わせる：

```typescript
    /** 悩み・相談窓口（本人向け） */
    CONSULTATION: '/consultation',
    CONSULTATION_DETAIL: (id: string) => `/consultation/${id}`,
    /** 悩み・相談窓口（対応者向けキュー） */
    ADMIN_CONSULTATION_QUEUE: '/adm/consultation-queue',
    ADMIN_CONSULTATION_QUEUE_DETAIL: (id: string) => `/adm/consultation-queue/${id}`,
```

Task 3, 4, 7 のコード中の `APP_ROUTES.ADMIN.CONSULTATION_QUEUE` 等の表記はこのフラット命名（`APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE`）に統一して読むこと。

- [ ] **Step 2: 型チェック**

Run: `npm run type-check`
Expected: `routes.ts` および `actions.ts` の参照エラーが無い。

- [ ] **Step 3: サービスマスタ登録マイグレーションを作成**

```bash
supabase migration new add_consultation_service_master
```

内容：

```sql
-- 悩み・相談窓口のメニュー表示用マスタ登録
-- service_category は既存の「ウェルビーイング」相当カテゴリが無い場合、ここで新規作成する。
-- 既存カテゴリのIDが判明している場合はこのINSERTを省略し、service.service_category_id にそのIDを使う。

INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 600, 'ウェルビーイング', '', 'released')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0002-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '悩み・相談窓口',
  'wellbeing',
  '悩み・相談窓口',
  '匿名または記名で人事・産業医に相談できる窓口です。',
  10,
  '/consultation',
  'employee',
  'released'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0003-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '相談窓口キュー管理',
  'wellbeing',
  '相談窓口キュー管理',
  '人事・産業医向けの相談受付一覧です。',
  11,
  '/adm/consultation-queue',
  'admin',
  'released'
) ON CONFLICT (id) DO NOTHING;
```

`app_role_service` / `tenant_service` への許可行追加は、ローカルSupabase Studio上でテナント運用に合わせて手動投入する（既存の `service_role` 管理画面 `/adm/service_role` から設定可能なため、本タスクではマスタ行の作成のみ行う）。

- [ ] **Step 4: マイグレーション適用**

```bash
supabase migration up
```

Expected: エラー無く適用される。

- [ ] **Step 5: Commit**

```bash
git add src/config/routes.ts supabase/migrations/
git commit -m "feat: add consultation desk routes and service master entries"
```

---

### Task 6: UIコンポーネント

**Files:**

- Create: `src/features/consultation/components/ConsultationForm.tsx`
- Create: `src/features/consultation/components/ConsultationThreadView.tsx`
- Create: `src/features/consultation/components/ConsultationQueueTable.tsx`

**Interfaces:**

- Consumes: Task 2 の型、Task 4 の `submitConsultation` / `replyToConsultation` / `updateConsultationStatus`
- Produces: 3つの Client Component（Task 7 のページから呼び出す）

- [ ] **Step 1: ConsultationForm.tsx を実装**

```tsx
// src/features/consultation/components/ConsultationForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitConsultation } from '../actions'
import { APP_ROUTES } from '@/config/routes'
import type { ConsultationCategory } from '../types'

const CATEGORY_OPTIONS: { value: ConsultationCategory; label: string }[] = [
  { value: 'harassment', label: 'ハラスメント' },
  { value: 'mental_health', label: 'メンタルヘルス' },
  { value: 'workload', label: '業務量' },
  { value: 'interpersonal', label: '人間関係' },
  { value: 'other', label: 'その他' },
]

export function ConsultationForm() {
  const router = useRouter()
  const [category, setCategory] = useState<ConsultationCategory>('other')
  const [body, setBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await submitConsultation({ category, body, isAnonymous })
        router.push(`/consultation/${result.id}`)
      } catch {
        setError('送信に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5"
    >
      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
        カテゴリ
        <select
          value={category}
          onChange={e => setCategory(e.target.value as ConsultationCategory)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
        相談内容
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={2000}
          rows={6}
          required
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={e => setIsAnonymous(e.target.checked)}
        />
        対応者には匿名で送信する
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || body.length === 0}
        className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
      >
        {isPending ? '送信中...' : '相談を送信'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: ConsultationThreadView.tsx を実装**

```tsx
// src/features/consultation/components/ConsultationThreadView.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { replyToConsultation, updateConsultationStatus } from '../actions'
import type { ConsultationThread, ConsultationStatus } from '../types'

interface ConsultationThreadViewProps {
  thread: ConsultationThread
  isStaff: boolean
}

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
}

export function ConsultationThreadView({ thread, isStaff }: ConsultationThreadViewProps) {
  const router = useRouter()
  const [replyBody, setReplyBody] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleReply = () => {
    startTransition(async () => {
      await replyToConsultation({ consultationId: thread.consultation.id, body: replyBody })
      setReplyBody('')
      router.refresh()
    })
  }

  const handleStatusChange = (status: ConsultationStatus) => {
    startTransition(async () => {
      await updateConsultationStatus({ consultationId: thread.consultation.id, status })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <span className="text-xs text-[var(--text-secondary)]">
          状態: {STATUS_LABEL[thread.consultation.status]}
        </span>
        {isStaff && (
          <select
            value={thread.consultation.status}
            onChange={e => handleStatusChange(e.target.value as ConsultationStatus)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="open">未対応</option>
            <option value="in_progress">対応中</option>
            <option value="resolved">解決済み</option>
          </select>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs">
          {thread.consultation.body}
        </div>
        {thread.replies.map(reply => (
          <div
            key={reply.id}
            className={`rounded-lg border border-slate-200 p-4 text-xs ${
              reply.is_staff_reply ? 'bg-slate-50' : 'bg-white'
            }`}
          >
            {reply.body}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          maxLength={2000}
          rows={3}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={handleReply}
          disabled={isPending || replyBody.length === 0}
          className="self-end rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          返信する
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ConsultationQueueTable.tsx を実装**

```tsx
// src/features/consultation/components/ConsultationQueueTable.tsx
'use client'

import { useRouter } from 'next/navigation'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { ConsultationQueueItem, ConsultationStatus } from '../types'

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
}

interface ConsultationQueueTableProps {
  items: ConsultationQueueItem[]
}

export function ConsultationQueueTable({ items }: ConsultationQueueTableProps) {
  const router = useRouter()

  const columns: Column<ConsultationQueueItem>[] = [
    { key: 'display_name', label: '相談者' },
    { key: 'category', label: 'カテゴリ' },
    {
      key: 'status',
      label: '状態',
      render: (value: ConsultationStatus) => STATUS_LABEL[value],
    },
    { key: 'created_at', label: '受付日時' },
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      searchable
      searchKey="display_name"
      getRowId={item => item.id}
      onRowAction={item => router.push(`/adm/consultation-queue/${item.id}`)}
    />
  )
}
```

- [ ] **Step 4: 型チェック**

Run: `npm run type-check`
Expected: 3コンポーネントに関するエラーが無い。

- [ ] **Step 5: Commit**

```bash
git add src/features/consultation/components/
git commit -m "feat: add consultation desk UI components"
```

---

### Task 7: ページ（本人向け・対応者向け）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/consultation/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/consultation/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/consultation/error.tsx`
- Create: `src/app/(tenant)/(tenant-users)/consultation/[id]/page.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/page.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 3 の `getMyConsultations` / `getConsultationThread` / `getConsultationQueue`、Task 6 の3コンポーネント、`getServerUser()`、`APP_ROUTES`

- [ ] **Step 1: 本人向け一覧+新規相談ページ**

```tsx
// src/app/(tenant)/(tenant-users)/consultation/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getMyConsultations } from '@/features/consultation/queries'
import { ConsultationForm } from '@/features/consultation/components/ConsultationForm'

export const metadata = { title: '悩み・相談窓口' }

export default async function ConsultationPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const consultations = await getMyConsultations(user.employee_id)

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <h1 className="text-sm font-semibold">悩み・相談窓口</h1>
      <ConsultationForm />
      <div className="flex flex-col gap-2">
        {consultations.map(c => (
          <Link
            key={c.id}
            href={`/consultation/${c.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 text-xs"
          >
            {c.category} - {c.status}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: loading.tsx / error.tsx（本人向け）**

```tsx
// src/app/(tenant)/(tenant-users)/consultation/loading.tsx
export default function Loading() {
  return <div className="px-4 sm:px-6 py-5 text-xs text-[var(--text-secondary)]">読み込み中...</div>
}
```

```tsx
// src/app/(tenant)/(tenant-users)/consultation/error.tsx
'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 sm:px-6 py-5 text-xs text-red-600">
      エラーが発生しました。
      <button onClick={reset} className="ml-2 underline">
        再試行
      </button>
    </div>
  )
}
```

- [ ] **Step 3: 本人向けスレッド詳細ページ**

```tsx
// src/app/(tenant)/(tenant-users)/consultation/[id]/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationThread } from '@/features/consultation/queries'
import { ConsultationThreadView } from '@/features/consultation/components/ConsultationThreadView'

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const thread = await getConsultationThread(id, user.employee_id, false)
  if (!thread) redirect(APP_ROUTES.TENANT.CONSULTATION)

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <ConsultationThreadView thread={thread} isStaff={false} />
    </div>
  )
}
```

- [ ] **Step 4: 対応者向けキューページ**

```tsx
// src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationQueue } from '@/features/consultation/queries'
import { ConsultationQueueTable } from '@/features/consultation/components/ConsultationQueueTable'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export default async function ConsultationQueuePage() {
  const user = await getServerUser()
  if (!user || !STAFF_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const items = await getConsultationQueue()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      <h1 className="text-sm font-semibold mb-4">相談窓口キュー管理</h1>
      <ConsultationQueueTable items={items} />
    </div>
  )
}
```

- [ ] **Step 5: 対応者向けスレッド詳細ページ + loading/error**

```tsx
// src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/[id]/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationThread } from '@/features/consultation/queries'
import { ConsultationThreadView } from '@/features/consultation/components/ConsultationThreadView'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export default async function ConsultationQueueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user?.employee_id || !STAFF_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const thread = await getConsultationThread(id, user.employee_id, true)
  if (!thread) redirect(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      <ConsultationThreadView thread={thread} isStaff />
    </div>
  )
}
```

```tsx
// src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/loading.tsx
export default function Loading() {
  return <div className="px-4 sm:px-6 py-5 text-xs text-[var(--text-secondary)]">読み込み中...</div>
}
```

```tsx
// src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/error.tsx
'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 sm:px-6 py-5 text-xs text-red-600">
      エラーが発生しました。
      <button onClick={reset} className="ml-2 underline">
        再試行
      </button>
    </div>
  )
}
```

- [ ] **Step 6: ビルド確認**

Run: `npm run type-check && npm run build`
Expected: エラー無く完了する。

- [ ] **Step 7: Commit**

```bash
git add "src/app/(tenant)/(tenant-users)/consultation" "src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue"
git commit -m "feat: add consultation desk pages for employees and staff"
```

---

### Task 8: コードレビュー・セキュリティレビュー（必須・既存ルール）

**Files:** なし（レビュー専用タスク）

**Interfaces:** Consumes: Task 1〜7 の全変更

- [ ] **Step 1: セキュリティレビューを実施**

CLAUDE.mdの「絶対禁止」「security.md」に従い、認証/RLS/ユーザー入力を含む本機能は `security-reviewer` agentによるレビューを必須実施する。特に以下を確認：

- 匿名相談で `employee_id` が常に保存され、表示層のみで匿名化されていること（データ漏洩経路がないこと）
- `consultations_update_staff` / `consultation_replies_insert` ポリシーが対応者ロール外からの更新を拒否すること

- [ ] **Step 2: コードレビューを実施**

`code-reviewer` agentによる一般レビューを実施し、CRITICAL/HIGH指摘を解消する。

- [ ] **Step 3: knowledge-work-plugins によるレビュー補助（任意・追加観点）**

`engineering` プラグインの `/review` で補助的な観点（性能・保守性）を確認する。既存必須レビューを置き換えない。

- [ ] **Step 4: Commit（レビュー対応の修正がある場合）**

```bash
git add -A
git commit -m "fix: address code review feedback for consultation desk"
```

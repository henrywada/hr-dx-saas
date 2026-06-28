# 悩み・相談窓口 v2（宛先選択・Claimロック）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1で実装済みの「5ロール全員が全相談を閲覧できる」共有キュー方式を、相談者が選んだ宛先グループにのみ表示し、対応者が明示的に「対応します」をクリックしてclaim（ロック）した後は相談者本人とclaimした1名だけが本文・返信を見られる方式に置き換える。

**Architecture:** 既存の `consultations` テーブルに `target_type` / `target_employee_id` / `claimed_by` / `claimed_at` を追加し、RLSポリシーを宛先＋claim状態ベースに全面差し替える。アプリ層は既存の `src/features/consultation/` 構成（queries.ts / actions.ts / types.ts / components/）を維持し、新規Server Action `claimConsultation` と新規query `getEligibleManagers` を追加する。匿名マスク処理（`sanitizeConsultationForViewer` / `sanitizeReplyForViewer`）は変更しない。

**Tech Stack:** Next.js 16 App Router、Supabase（PostgreSQL + RLS）、Zod v4、TypeScript 5（strict: false）、`node:test` + `node:assert/strict`（`./node_modules/.bin/tsx --test`）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-06-27-consultation-desk-routing-v2-design.md`（このプランの正典）
- 対応者ロールは5種固定: `hr`, `hr_manager`, `company_doctor`, `company_nurse`, `hsc`（`src/features/consultation/actions.ts` の `STAFF_ROLES` と同一）
- `target_type` は6種固定: `medical_staff`, `hr`, `hr_manager`, `manager`, `hsc`, `other_any`
- `target_type = 'manager'` のときのみ `target_employee_id` が必須、他では `NULL`（DB CHECK制約で保証）
- 「上司」指名は `employees.is_manager = true` の全社プール（直属上司に固定しない、匿名性維持のため）
- claim操作はアトミック（`UPDATE ... WHERE claimed_by IS NULL` の更新行数で競合判定）
- claim後は相談本文・返信スレッド全体が、相談者本人とclaimした1名にのみ見える（他の同グループスタッフも含め完全非表示）
- 返信（`replyToConsultation`）はclaim後のみ可能
- 匿名UIは「匿名を希望する」/「匿名を希望しない」の明示二択（チェックボックス禁止）
- データアクセスパターン厳守: `page.tsx`（Server Component） → `queries.ts`（SELECTのみ） → Client Component → `actions.ts`（Server Actions、書き込みのみ）。`page.tsx` に `supabase.from(...)` を直書きしない
- コードコメントは日本語で記述する
- 本プロジェクトに component-level テストフレームワーク（jest/vitest/testing-library）は存在しない。UIコンポーネントの検証は型チェック（`npm run type-check`）と既存パターンへの準拠で行う
- Supabase 型生成: `supabase gen types typescript --local`（DBスキーマを変更したら必ず実行する。出力は `2>/dev/null` でCLIノイズを除去してから `> ファイル` にリダイレクトする。`cmd > file 2>&1 | grep` は機能しない（パイプには何も流れずファイルにノイズが混入する）ので使わないこと）
- `supabase db reset` は絶対に実行しない（ローカルデータが消滅する）

---

## ファイル構成

| ファイル | 変更内容 |
| --- | --- |
| `supabase/migrations/20260627185930_add_consultation_routing_v2.sql` | 新規。カラム追加・CHECK制約・RLS全面差し替え |
| `src/lib/supabase/types.ts` | 再生成（手動編集しない） |
| `src/features/consultation/types.ts` | `ConsultationTargetType` 型追加、`Consultation`/`ConsultationQueueItem` にフィールド追加、`EligibleManager` 型追加 |
| `src/features/consultation/queries.test.ts` | 既存の `baseConsultation` リテラルに新フィールド追加（型エラー解消） |
| `src/features/consultation/queries.ts` | `getEligibleManagers` 新規追加、`getConsultationThread`/`getConsultationQueue` の select 文更新 |
| `src/features/consultation/actions.test.ts` | `submitConsultationSchema` の新フィールドに対するテスト追加 |
| `src/features/consultation/actions.ts` | `claimConsultation` 新規追加、`submitConsultationSchema`/`submitConsultation`/`replyToConsultation`/`updateConsultationStatus` 更新 |
| `src/app/(tenant)/(tenant-users)/consultation/page.tsx` | `getEligibleManagers()` を呼び出し `ConsultationForm` に props で渡す |
| `src/features/consultation/components/ConsultationForm.tsx` | 匿名二択化、宛先2段階選択UI追加 |
| `src/features/consultation/components/ConsultationQueueTable.tsx` | 「対応状況」列追加 |
| `src/features/consultation/components/ConsultationThreadView.tsx` | claim前ゲートUI、claim後の表示分岐 |

---

### Task 1: データベースマイグレーション（カラム追加・RLS全面差し替え）

**Files:**
- Create: `supabase/migrations/20260627185930_add_consultation_routing_v2.sql`

**Interfaces:**
- Produces: `consultations.target_type` (TEXT, 6値のCHECK制約), `consultations.target_employee_id` (UUID, nullable), `consultations.claimed_by` (UUID, nullable), `consultations.claimed_at` (TIMESTAMPTZ, nullable)。後続タスクはこれらのカラム名をそのまま使う。

> 注: 設計書（`docs/superpowers/specs/2026-06-27-consultation-desk-routing-v2-design.md` の section 5）には、claim後にステータス（`status`）を更新するためのUPDATEポリシーが含まれていない。`consultations_claim` ポリシーは `USING (claimed_by IS NULL ...)` のため、claim完了後の行には一切UPDATEポリシーがマッチせず、既存の `updateConsultationStatus` Server Action（Task 4で更新）が機能しなくなる。これは設計の見落としであり、本タスクで `consultations_update_claimed_by_me` ポリシーを追加して塞ぐ（claimした本人が自分のclaimした行に対してのみUPDATE可能）。

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- 悩み・相談窓口 v2: 宛先選択・Claimロック
-- 設計: docs/superpowers/specs/2026-06-27-consultation-desk-routing-v2-design.md

ALTER TABLE public.consultations
  ADD COLUMN target_type TEXT NOT NULL DEFAULT 'other_any'
    CHECK (target_type IN ('medical_staff', 'hr', 'hr_manager', 'manager', 'hsc', 'other_any')),
  ADD COLUMN target_employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN claimed_by UUID REFERENCES public.employees(id),
  ADD COLUMN claimed_at TIMESTAMPTZ;

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_target_employee_id_check
    CHECK (
      (target_type = 'manager' AND target_employee_id IS NOT NULL)
      OR (target_type <> 'manager' AND target_employee_id IS NULL)
    );

CREATE INDEX idx_consultations_target_claimed ON public.consultations (target_type, claimed_by);

-- 既存のRLSポリシーを宛先＋claim状態ベースに全面差し替える
DROP POLICY "consultations_select_staff" ON public.consultations;
DROP POLICY "consultations_update_staff" ON public.consultations;

CREATE POLICY "consultations_select_target_unclaimed" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND claimed_by IS NULL
    AND (
      (target_type = 'medical_staff' AND current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']))
      OR (target_type = 'hr' AND current_employee_app_role() = 'hr')
      OR (target_type = 'hr_manager' AND current_employee_app_role() = 'hr_manager')
      OR (target_type = 'hsc' AND current_employee_app_role() = 'hsc')
      OR (target_type = 'manager' AND target_employee_id = current_employee_id())
      OR (target_type = 'other_any' AND (
            current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'hsc'])
            OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = current_employee_id() AND e.is_manager = true)
          ))
    )
  );

CREATE POLICY "consultations_select_claimed_by_me" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND claimed_by = current_employee_id()
  );

-- claim操作専用: 未claimの行を、宛先に該当する者だけが claimed_by=自分 に更新できる
CREATE POLICY "consultations_claim" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND claimed_by IS NULL
    AND (
      (target_type = 'medical_staff' AND current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']))
      OR (target_type = 'hr' AND current_employee_app_role() = 'hr')
      OR (target_type = 'hr_manager' AND current_employee_app_role() = 'hr_manager')
      OR (target_type = 'hsc' AND current_employee_app_role() = 'hsc')
      OR (target_type = 'manager' AND target_employee_id = current_employee_id())
      OR (target_type = 'other_any' AND (
            current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'hsc'])
            OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = current_employee_id() AND e.is_manager = true)
          ))
    )
  )
  WITH CHECK (claimed_by = current_employee_id());

-- claim済みの行に対する以後の更新（ステータス変更等）は claim した本人のみ許可
-- （設計書のRLSにはこのポリシーが無く、claim後は updateConsultationStatus が
--  マッチするUPDATEポリシーを持たなくなるため、本マイグレーションで追加する）
CREATE POLICY "consultations_update_claimed_by_me" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND claimed_by = current_employee_id()
  )
  WITH CHECK (claimed_by = current_employee_id());

-- consultations_select_self / consultations_insert_self は変更しない（相談者本人の閲覧・投稿はv1のまま）

-- consultation_replies: claim前は誰も読み書きできない
DROP POLICY "consultation_replies_select" ON public.consultation_replies;
DROP POLICY "consultation_replies_insert" ON public.consultation_replies;

CREATE POLICY "consultation_replies_select" ON public.consultation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (c.employee_id = current_employee_id() OR c.claimed_by = current_employee_id())
    )
  );

CREATE POLICY "consultation_replies_insert" ON public.consultation_replies
  FOR INSERT WITH CHECK (
    author_employee_id = current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND c.claimed_by IS NOT NULL
        AND (c.employee_id = current_employee_id() OR c.claimed_by = current_employee_id())
    )
  );
```

- [ ] **Step 2: マイグレーションを適用する**

Run: `supabase migration up`
Expected: `Applying migration 20260627185930_add_consultation_routing_v2.sql...` が表示され、エラーなく完了する

- [ ] **Step 3: Supabaseの型定義を再生成する**

Run: `supabase gen types typescript --local 2>/dev/null | grep -v "^Connecting to db\|^A new version" > src/lib/supabase/types.ts`
Expected: コマンドが正常終了し、`src/lib/supabase/types.ts` 内の `consultations` 型に `target_type`, `target_employee_id`, `claimed_by`, `claimed_at` が含まれる（`grep -n "target_type" src/lib/supabase/types.ts` で確認）

- [ ] **Step 4: 既存コードに型エラーが出ていないことを確認する**

Run: `npm run type-check`
Expected: エラーなし（このタスクではアプリコードを変更していないため、既存コードは新カラムを参照せず問題ない）

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260627185930_add_consultation_routing_v2.sql src/lib/supabase/types.ts
git commit -m "feat: add target routing and claim columns to consultations schema"
```

---

### Task 2: types.ts 更新（型定義の追加）

**Files:**
- Modify: `src/features/consultation/types.ts`
- Modify: `src/features/consultation/queries.test.ts:37-47`（既存の `baseConsultation` リテラルが新フィールドを持たず型エラーになるため更新）

**Interfaces:**
- Consumes: Task 1で追加されたDBカラム（`target_type`, `target_employee_id`, `claimed_by`, `claimed_at`）
- Produces: `ConsultationTargetType`, 更新済み `Consultation`（`target_type: ConsultationTargetType`, `target_employee_id: string | null`, `claimed_by: string | null`, `claimed_at: string | null` を追加）, 更新済み `ConsultationQueueItem`（`claimed_by: string | null` を追加）, `EligibleManager`（`id: string`, `name: string`）。後続タスクはこれらの型名・フィールド名をそのまま使う。

- [ ] **Step 1: `types.ts` に新しい型・フィールドを追加する**

`src/features/consultation/types.ts` の内容を以下に置き換える:

```typescript
// src/features/consultation/types.ts

export type ConsultationCategory =
  | 'harassment'
  | 'mental_health'
  | 'workload'
  | 'interpersonal'
  | 'other'

export type ConsultationStatus = 'open' | 'in_progress' | 'resolved'

/** 相談の宛先区分。manager のときのみ target_employee_id が必須 */
export type ConsultationTargetType =
  | 'medical_staff'
  | 'hr'
  | 'hr_manager'
  | 'manager'
  | 'hsc'
  | 'other_any'

export interface Consultation {
  id: string
  tenant_id: string
  /** 匿名相談を対応者が閲覧する場合は null（表示層への実名漏洩防止、queries.ts 参照） */
  employee_id: string | null
  is_anonymous: boolean
  category: ConsultationCategory
  body: string
  status: ConsultationStatus
  assigned_to: string | null
  target_type: ConsultationTargetType
  /** target_type='manager' のときのみ非null（指名された上司の employees.id） */
  target_employee_id: string | null
  /** 対応を宣言（claim）した職員の employees.id。null は未対応 */
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
}

export interface ConsultationReply {
  id: string
  consultation_id: string
  /** 匿名相談を対応者が閲覧する場合、相談者本人の返信は null（表示層への実名漏洩防止） */
  author_employee_id: string | null
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
  /** 対応を宣言した職員の employees.id。null は未対応 */
  claimed_by: string | null
  created_at: string
}

export interface ConsultationThread {
  consultation: Consultation
  replies: ConsultationReply[]
}

/** 「上司」宛先選択用の候補（employees.is_manager = true の全社プール） */
export interface EligibleManager {
  id: string
  name: string
}
```

- [ ] **Step 2: 既存テストの型エラーを解消する**

`src/features/consultation/queries.test.ts:37-47` の `baseConsultation` を以下に置き換える:

```typescript
const baseConsultation: Consultation = {
  id: 'cons-1',
  tenant_id: 'tenant-1',
  employee_id: 'employee-1',
  is_anonymous: true,
  category: 'other',
  body: '本文',
  status: 'open',
  assigned_to: null,
  target_type: 'other_any',
  target_employee_id: null,
  claimed_by: null,
  claimed_at: null,
  created_at: '2026-06-27T00:00:00.000Z',
}
```

- [ ] **Step 3: 型チェックとテストを実行する**

Run: `npm run type-check && ./node_modules/.bin/tsx --test src/features/consultation/queries.test.ts`
Expected: 型エラーなし、既存11件のテストがすべてPASS

- [ ] **Step 4: Commit**

```bash
git add src/features/consultation/types.ts src/features/consultation/queries.test.ts
git commit -m "feat: add target routing and claim fields to consultation types"
```

---

### Task 3: queries.ts 更新（getEligibleManagers 追加、select 文更新）

**Files:**
- Modify: `src/features/consultation/queries.ts`

**Interfaces:**
- Consumes: `Consultation`, `ConsultationQueueItem`, `EligibleManager`（Task 2）
- Produces: `getEligibleManagers(): Promise<EligibleManager[]>`。Task 5（`ConsultationForm` 用 props）がこの関数を使う。

- [ ] **Step 1: `getConsultationThread` の select 文に新カラムを追加する**

`src/features/consultation/queries.ts:71-75` の `getConsultationThread` 内の select 文を変更する:

```typescript
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select(
      'id, tenant_id, employee_id, is_anonymous, category, body, status, assigned_to, target_type, target_employee_id, claimed_by, claimed_at, created_at'
    )
    .eq('id', consultationId)
    .maybeSingle()
```

- [ ] **Step 2: `getConsultationQueue` の select 文とマッピングに `claimed_by` を追加する**

`src/features/consultation/queries.ts:110-132` の `getConsultationQueue` を以下に置き換える:

```typescript
export async function getConsultationQueue(): Promise<ConsultationQueueItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, category, status, is_anonymous, claimed_by, created_at, employees:employee_id(name)')
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
    claimed_by: row.claimed_by,
    created_at: row.created_at,
    employee_name: (row.employees as { name?: string } | null)?.name ?? null,
  }))

  return maskAnonymousAuthor(rows)
}
```

- [ ] **Step 3: `getEligibleManagers` を新規追加する**

ファイル末尾に追加する:

```typescript
/**
 * 「上司」宛先選択用に、テナント内で is_manager=true の全従業員を返す。
 * 直属上司に固定しない（匿名性維持のため、相談者が任意の1名を指名できるようにする）。
 * employees_select_same_tenant の既存RLSにより自テナント内のみ取得される。
 */
export async function getEligibleManagers(): Promise<EligibleManager[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .eq('is_manager', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('getEligibleManagers error:', error)
    return []
  }
  return data || []
}
```

- [ ] **Step 4: import 文に `EligibleManager` を追加する**

`src/features/consultation/queries.ts:1-8` の import を以下に置き換える:

```typescript
import { createClient } from '@/lib/supabase/server'
import type {
  Consultation,
  ConsultationListItem,
  ConsultationQueueItem,
  ConsultationReply,
  ConsultationThread,
  EligibleManager,
} from './types'
```

- [ ] **Step 5: 型チェックと既存テストを実行する**

Run: `npm run type-check && ./node_modules/.bin/tsx --test src/features/consultation/queries.test.ts`
Expected: 型エラーなし、既存11件のテストがすべてPASS（`getEligibleManagers` はDB接続を要するため自動テスト対象外。既存コードベースにDB呼び出し関数の単体テストは存在せず、この方針に合わせる）

- [ ] **Step 6: Commit**

```bash
git add src/features/consultation/queries.ts
git commit -m "feat: add getEligibleManagers query and select claim/target columns"
```

---

### Task 4: actions.ts 更新（claimConsultation 追加、submit/reply/status 更新）

**Files:**
- Modify: `src/features/consultation/actions.ts`
- Modify: `src/features/consultation/actions.test.ts`

**Interfaces:**
- Consumes: `getServerUser()`（`@/lib/auth/server-user`）, `APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE` / `ADMIN_CONSULTATION_QUEUE_DETAIL`（`@/config/routes`、既存）
- Produces: `claimConsultation(consultationId: string): Promise<void>`。Task 7（`ConsultationThreadView`）がこの関数を呼ぶ。更新済み `submitConsultationSchema`（`targetType`, `targetEmployeeId` フィールド追加）。Task 5（`ConsultationForm`）がこのスキーマの形に合わせて送信する。

- [ ] **Step 1: 失敗するテストを書く（`submitConsultationSchema` の宛先バリデーション）**

`src/features/consultation/actions.test.ts` の末尾に追加する:

```typescript
test('targetType=manager かつ targetEmployeeId 指定時はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'interpersonal',
    body: '上司に関する相談です',
    isAnonymous: true,
    targetType: 'manager',
    targetEmployeeId: '11111111-1111-1111-1111-111111111111',
  })
  assert.equal(result.success, true)
})

test('targetType=manager だが targetEmployeeId 未指定の場合は拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'interpersonal',
    body: '上司に関する相談です',
    isAnonymous: true,
    targetType: 'manager',
  })
  assert.equal(result.success, false)
})

test('targetType=hr かつ targetEmployeeId が指定されている場合は拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '人事への相談です',
    isAnonymous: false,
    targetType: 'hr',
    targetEmployeeId: '11111111-1111-1111-1111-111111111111',
  })
  assert.equal(result.success, false)
})

test('targetType=hr かつ targetEmployeeId 未指定の場合はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '人事への相談です',
    isAnonymous: false,
    targetType: 'hr',
  })
  assert.equal(result.success, true)
})

test('不正な targetType は拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'other',
    body: '本文',
    isAnonymous: false,
    targetType: 'invalid_target',
  })
  assert.equal(result.success, false)
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `./node_modules/.bin/tsx --test src/features/consultation/actions.test.ts`
Expected: 新規5件が `targetType` フィールド未定義によりFAIL（既存4件はPASS）

- [ ] **Step 3: `actions.ts` を更新する**

`src/features/consultation/actions.ts` の全文を以下に置き換える:

```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export const submitConsultationSchema = z
  .object({
    category: z.enum(['harassment', 'mental_health', 'workload', 'interpersonal', 'other']),
    body: z.string().min(1).max(2000),
    isAnonymous: z.boolean(),
    targetType: z.enum(['medical_staff', 'hr', 'hr_manager', 'manager', 'hsc', 'other_any']),
    targetEmployeeId: z.string().uuid().optional(),
  })
  .refine(data => (data.targetType === 'manager') === (data.targetEmployeeId !== undefined), {
    message: 'targetType が manager の場合のみ targetEmployeeId が必須です',
    path: ['targetEmployeeId'],
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
      target_type: parsed.targetType,
      target_employee_id: parsed.targetType === 'manager' ? parsed.targetEmployeeId : null,
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

  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('employee_id, claimed_by')
    .eq('id', parsed.consultationId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!consultation) throw new Error('Not found')
  if (!consultation.claimed_by) throw new Error('まだ対応者が決まっていません')

  const isOwner = consultation.employee_id === user.employee_id
  const isClaimer = consultation.claimed_by === user.employee_id
  if (!isOwner && !isClaimer) throw new Error('Forbidden')

  const { error } = await supabase.from('consultation_replies').insert({
    consultation_id: parsed.consultationId,
    author_employee_id: user.employee_id,
    body: parsed.body,
    is_staff_reply: isClaimer,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.CONSULTATION_DETAIL(parsed.consultationId))
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(parsed.consultationId))
}

/**
 * 「対応します」ボタンによる明示的なclaim（対応宣言）。
 * UPDATE ... WHERE claimed_by IS NULL のアトミック更新で競合を解消する：
 * 更新行数が0件なら既に他者がclaim済みであり、エラーを返す（楽観的ロック）。
 * 対象者であることのチェックはRLSの consultations_claim ポリシーが担う。
 */
export async function claimConsultation(consultationId: string): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .update({ claimed_by: user.employee_id, claimed_at: new Date().toISOString() })
    .eq('id', consultationId)
    .is('claimed_by', null)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('既に他の方が対応中です')
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(consultationId))
}

const updateStatusSchema = z.object({
  consultationId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved']),
})

export async function updateConsultationStatus(
  input: z.infer<typeof updateStatusSchema>
): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')
  if (!STAFF_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')

  const parsed = updateStatusSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('consultations')
    .update({ status: parsed.status })
    .eq('id', parsed.consultationId)
    .eq('claimed_by', user.employee_id)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
}
```

> 変更点の補足: `replyToConsultation` は `STAFF_ROLES` ではなく `claimed_by` との一致で職員判定するようになった（claim後はclaimした1名のみがアクセスできるため、ロール判定よりclaim一致の方が正確）。`updateConsultationStatus` には `.eq('claimed_by', user.employee_id)` を追加し、Task 1で追加した `consultations_update_claimed_by_me` ポリシーと一致させた（自分がclaimした行のみ更新可能）。

- [ ] **Step 4: テストを実行してすべてPASSすることを確認する**

Run: `./node_modules/.bin/tsx --test src/features/consultation/actions.test.ts`
Expected: 9件全てPASS（既存4件 + 新規5件）

- [ ] **Step 5: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 6: Commit**

```bash
git add src/features/consultation/actions.ts src/features/consultation/actions.test.ts
git commit -m "feat: add claimConsultation action and target routing to submit/reply/status actions"
```

---

### Task 5: ConsultationForm.tsx 更新（匿名二択化・宛先2段階選択）

**Files:**
- Modify: `src/features/consultation/components/ConsultationForm.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/consultation/page.tsx`

**Interfaces:**
- Consumes: `getEligibleManagers()`（Task 3）, `EligibleManager`（Task 2）, `submitConsultation`（Task 4、`targetType`/`targetEmployeeId` を含む形に変更済み）
- Produces: `ConsultationForm` の props に `eligibleManagers: EligibleManager[]` を追加（破壊的変更。呼び出し元の `page.tsx` も同時に更新する）

- [ ] **Step 1: `page.tsx` で `getEligibleManagers()` を取得し props で渡す**

`src/app/(tenant)/(tenant-users)/consultation/page.tsx` を以下に置き換える:

```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getMyConsultations, getEligibleManagers } from '@/features/consultation/queries'
import { ConsultationForm } from '@/features/consultation/components/ConsultationForm'
import { CATEGORY_LABEL, STATUS_LABEL } from '@/features/consultation/labels'

export const metadata = { title: '悩み・相談窓口' }

export default async function ConsultationPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [consultations, eligibleManagers] = await Promise.all([
    getMyConsultations(user.employee_id),
    getEligibleManagers(),
  ])

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-5 mx-auto max-w-300">
      <h1 className="text-sm font-semibold">悩み・相談窓口</h1>
      <ConsultationForm eligibleManagers={eligibleManagers} />
      <div className="flex flex-col gap-2">
        {consultations.map(c => (
          <Link
            key={c.id}
            href={APP_ROUTES.TENANT.CONSULTATION_DETAIL(c.id)}
            className="rounded-lg border border-slate-200 bg-white p-4 text-xs"
          >
            {CATEGORY_LABEL[c.category]} - {STATUS_LABEL[c.status]} -{' '}
            {format(new Date(c.created_at), 'M/d (E) HH:mm', { locale: ja })}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `ConsultationForm.tsx` を匿名二択＋宛先2段階選択に更新する**

`src/features/consultation/components/ConsultationForm.tsx` の全文を以下に置き換える:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitConsultation } from '../actions'
import { APP_ROUTES } from '@/config/routes'
import type { ConsultationCategory, EligibleManager } from '../types'

const CATEGORY_OPTIONS: { value: ConsultationCategory; label: string }[] = [
  { value: 'harassment', label: 'ハラスメント' },
  { value: 'mental_health', label: 'メンタルヘルス' },
  { value: 'workload', label: '業務量' },
  { value: 'interpersonal', label: '人間関係' },
  { value: 'other', label: 'その他' },
]

type BigCategory = 'medical_staff' | 'other'
type OtherTarget = 'hr' | 'hr_manager' | 'manager' | 'hsc' | 'other_any'

const OTHER_TARGET_OPTIONS: { value: OtherTarget; label: string }[] = [
  { value: 'hr', label: '人事' },
  { value: 'hr_manager', label: '人事責任者' },
  { value: 'manager', label: '上司' },
  { value: 'hsc', label: '安全衛生委員' },
  { value: 'other_any', label: '誰でもいい' },
]

interface ConsultationFormProps {
  eligibleManagers: EligibleManager[]
}

export function ConsultationForm({ eligibleManagers }: ConsultationFormProps) {
  const router = useRouter()
  const [category, setCategory] = useState<ConsultationCategory>('other')
  const [body, setBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [bigCategory, setBigCategory] = useState<BigCategory>('other')
  const [otherTarget, setOtherTarget] = useState<OtherTarget>('hr')
  const [managerId, setManagerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const targetType = bigCategory === 'medical_staff' ? 'medical_staff' : otherTarget

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (targetType === 'manager' && managerId === '') {
      setError('指名する上司を選択してください。')
      return
    }

    startTransition(async () => {
      try {
        const result = await submitConsultation({
          category,
          body,
          isAnonymous,
          targetType,
          targetEmployeeId: targetType === 'manager' ? managerId : undefined,
        })
        router.push(APP_ROUTES.TENANT.CONSULTATION_DETAIL(result.id))
      } catch {
        setError('送信に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
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

      <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
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

      <fieldset className="flex flex-col gap-1 text-xs text-(--text-secondary)">
        <legend>相談先</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="bigCategory"
            checked={bigCategory === 'medical_staff'}
            onChange={() => setBigCategory('medical_staff')}
          />
          産業医・保健師
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="bigCategory"
            checked={bigCategory === 'other'}
            onChange={() => setBigCategory('other')}
          />
          その他
        </label>
      </fieldset>

      {bigCategory === 'other' && (
        <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
          相談先（詳細）
          <select
            value={otherTarget}
            onChange={e => setOtherTarget(e.target.value as OtherTarget)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            {OTHER_TARGET_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {bigCategory === 'other' && otherTarget === 'manager' && (
        <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
          指名する上司
          <select
            value={managerId}
            onChange={e => setManagerId(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="">選択してください</option>
            {eligibleManagers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-1 text-xs text-(--text-secondary)">
        <legend>匿名性</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="isAnonymous"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(true)}
          />
          匿名を希望する
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="isAnonymous"
            checked={!isAnonymous}
            onChange={() => setIsAnonymous(false)}
          />
          匿名を希望しない
        </label>
      </fieldset>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || body.length === 0}
        className="rounded-lg bg-(--brand) px-3 py-1.5 text-xs text-white disabled:opacity-50"
      >
        {isPending ? '送信中...' : '相談を送信'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: 動作確認（ローカル開発サーバー）**

Run: `npm run dev`
Expected: `/consultation` にアクセスし、「相談先」で「その他」→「上司」を選ぶと上司ドロップダウンが表示され、`eligibleManagers` の一覧（`employees.is_manager = true`）が選択肢に出ることを目視確認する。「匿名性」がラジオボタン二択になっていることを確認する。

- [ ] **Step 5: Commit**

```bash
git add src/features/consultation/components/ConsultationForm.tsx src/app/\(tenant\)/\(tenant-users\)/consultation/page.tsx
git commit -m "feat: replace anonymity checkbox with explicit choice and add two-step target selection"
```

---

### Task 6: ConsultationQueueTable.tsx 更新（対応状況列の追加）

**Files:**
- Modify: `src/features/consultation/components/ConsultationQueueTable.tsx`

**Interfaces:**
- Consumes: `ConsultationQueueItem.claimed_by`（Task 2/3で追加済み）

- [ ] **Step 1: 「対応状況」列を追加する**

`src/features/consultation/components/ConsultationQueueTable.tsx` の `columns` 配列（`category` 列の直後）に以下を追加する:

```typescript
    {
      key: 'claimed_by',
      label: '対応状況',
      render: (value: string | null) => (value ? '対応中' : '未対応'),
    },
```

変更後の `columns` 配列全体（参考、`category` と `status` の間に挿入）:

```typescript
  const columns: Column<ConsultationQueueItem>[] = [
    {
      key: 'display_name',
      label: '相談者',
      render: (value: string, item) => (
        <Link
          href={APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(item.id)}
          className="text-(--brand) hover:underline"
        >
          {value}
        </Link>
      ),
    },
    {
      key: 'category',
      label: 'カテゴリ',
      render: (value: ConsultationCategory) => CATEGORY_LABEL[value],
    },
    {
      key: 'claimed_by',
      label: '対応状況',
      render: (value: string | null) => (value ? '対応中' : '未対応'),
    },
    {
      key: 'status',
      label: '状態',
      render: (value: ConsultationStatus) => STATUS_LABEL[value],
    },
    {
      key: 'created_at',
      label: '受付日時',
      render: (value: string) => format(new Date(value), 'M/d (E) HH:mm', { locale: ja }),
    },
  ]
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/consultation/components/ConsultationQueueTable.tsx
git commit -m "feat: add claim status column to consultation queue table"
```

---

### Task 7: ConsultationThreadView.tsx 更新（claimゲートUI）

**Files:**
- Modify: `src/features/consultation/components/ConsultationThreadView.tsx`

**Interfaces:**
- Consumes: `claimConsultation`（Task 4）, `Consultation.claimed_by`（Task 2）

- [ ] **Step 1: claim前ゲートと表示分岐を実装する**

`src/features/consultation/components/ConsultationThreadView.tsx` の全文を以下に置き換える:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { claimConsultation, replyToConsultation, updateConsultationStatus } from '../actions'
import { STATUS_LABEL } from '../labels'
import type { ConsultationThread, ConsultationStatus } from '../types'

interface ConsultationThreadViewProps {
  thread: ConsultationThread
  isStaff: boolean
}

export function ConsultationThreadView({ thread, isStaff }: ConsultationThreadViewProps) {
  const router = useRouter()
  const [replyBody, setReplyBody] = useState('')
  const [claimError, setClaimError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isUnclaimed = thread.consultation.claimed_by === null
  const showClaimGate = isStaff && isUnclaimed

  const handleClaim = () => {
    setClaimError(null)
    startTransition(async () => {
      try {
        await claimConsultation(thread.consultation.id)
        router.refresh()
      } catch {
        setClaimError('既に他の方が対応中です')
      }
    })
  }

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

  if (showClaimGate) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs">{thread.consultation.body}</div>
        {claimError && <p className="text-xs text-red-600">{claimError}</p>}
        <button
          type="button"
          onClick={handleClaim}
          disabled={isPending}
          className="self-start rounded-lg bg-(--brand) px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          対応します
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <span className="text-xs text-(--text-secondary)">
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
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs">{thread.consultation.body}</div>
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

      {isUnclaimed ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-(--text-secondary)">
          対応者が決まるまでお待ちください。
        </p>
      ) : (
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
            className="self-end rounded-lg bg-(--brand) px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            返信する
          </button>
        </div>
      )}
    </div>
  )
}
```

> 設計上の根拠: `isStaff` で見えている時点で、RLSの `consultations_select_target_unclaimed`（未claim時）または `consultations_select_claimed_by_me`（claim後）のいずれかを通過済みである。後者は `claimed_by = current_employee_id()` 一致が前提のため、`isStaff && !isUnclaimed` の状態で他人がclaimした行が見えることはあり得ない。したがって `viewerEmployeeId` をpropsで受け取って比較する必要はなく、`isUnclaimed` の真偽だけで分岐できる。

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: 動作確認（ローカル開発サーバー）**

Run: `npm run dev`
Expected:
1. 一般従業員アカウントで `/consultation` から相談を送信する（宛先「人事」を選択）
2. `hr` ロールのアカウントで `/adm/consultation-queue` にアクセスし、その相談が一覧に「未対応」で表示されることを確認する
3. 詳細ページで「対応します」ボタンのみが表示され、返信フォームが無いことを確認する
4. 「対応します」をクリックし、本文＋ステータス変更＋返信フォームが表示されることを確認する
5. 別の `hr` ロールのアカウントで同じ相談にアクセスし、一覧・詳細のいずれにも表示されない（404扱いでリダイレクトされる）ことを確認する
6. 相談者本人のアカウントで詳細ページを確認し、claim前は「対応者が決まるまでお待ちください。」、claim後は返信フォームが表示されることを確認する

- [ ] **Step 4: Commit**

```bash
git add src/features/consultation/components/ConsultationThreadView.tsx
git commit -m "feat: add claim gate UI and post-claim visibility branching to thread view"
```

---

### Task 8: 全体テスト実行・最終レビュー

**Files:** なし（検証のみ）

**Interfaces:** なし

- [ ] **Step 1: feature配下の全テストを実行する**

Run: `./node_modules/.bin/tsx --test src/features/consultation/queries.test.ts src/features/consultation/actions.test.ts`
Expected: 全件PASS（queries.test.ts 11件、actions.test.ts 9件）

- [ ] **Step 2: 型チェックとビルドを実行する**

Run: `npm run type-check && npm run build`
Expected: エラーなく完了する

- [ ] **Step 3: lintを実行する**

Run: `npm run lint`
Expected: エラーなし

- [ ] **Step 4: Commit（必要な修正があれば）**

lintやビルドで修正が必要だった場合のみ:

```bash
git add -A
git commit -m "fix: address lint/build issues from final verification"
```

---

## 自己レビュー結果

**1. 設計書カバレッジ:**
- 匿名二択（design section 2.1） → Task 5 ✅
- カテゴリ維持（design section 2.2） → 変更なし、Task 5で維持 ✅
- 宛先2段階選択＋上司プール指名（design section 2.3） → Task 4（スキーマ）+ Task 5（UI） ✅
- claimアトミック操作（design section 3.2） → Task 4 ✅
- claim後の完全非表示（design section 3.3） → Task 1（RLS）+ Task 7（UI） ✅
- claim前のreply拒否（design section 3.4） → Task 4 ✅
- データモデル変更（design section 4） → Task 1 ✅
- RLS全面差し替え（design section 5） → Task 1（+ 見落とされていた `consultations_update_claimed_by_me` を追加） ✅
- `claimConsultation` / `replyToConsultation` / `getEligibleManagers`（design section 6） → Task 3, 4 ✅
- UI変更（design section 6 UI変更欄） → Task 5, 6, 7 ✅

**2. プレースホルダースキャン:** 「TBD」「TODO」「あとで」等のパターンは無い。全ステップに実際のコード・コマンドを記載済み。

**3. 型整合性チェック:** `Consultation`（Task 2）→ `getConsultationThread`/`getConsultationQueue` のselect列（Task 3）→ `sanitizeConsultationForViewer`/`sanitizeReplyForViewer`（既存、変更なし）→ `ConsultationThreadView` の `thread.consultation.claimed_by`（Task 7）まで、フィールド名は `target_type` / `target_employee_id` / `claimed_by` / `claimed_at` で一貫。`EligibleManager`（Task 2: `{id, name}`）→ `getEligibleManagers`（Task 3の戻り値）→ `ConsultationForm` props（Task 5の `eligibleManagers`）まで型名・形が一致。`submitConsultationSchema` の `targetType`/`targetEmployeeId`（Task 4）→ `ConsultationForm` の送信ペイロード（Task 5）のキー名が一致。

**4. 設計の見落とし修正:** 設計書のRLS（section 5）には claim後のステータス更新を許可するUPDATEポリシーが欠落していたため、Task 1で `consultations_update_claimed_by_me` を追加し、Task 4の `updateConsultationStatus` に `.eq('claimed_by', user.employee_id)` を追加して整合させた。

---

## 実行方法

プラン作成完了。実行方式は以下のいずれかを選択する:

1. **Subagent-Driven（推奨）** — タスクごとに新規サブエージェントを派遣し、タスク間でレビューを実施。高速反復。
2. **Inline Execution** — 本セッション内で `executing-plans` により一括実行、チェックポイントでレビュー。

# サクセッションプラン（後継者管理）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重要ポジションの後継候補を登録・管理し、9-Boxグリッド・準備度スコア・依存リスクを可視化する人事管理者向けダッシュボードを実装する。

**Architecture:** `src/features/succession-plan/` を新設し、DBマイグレーション（新規テーブルのみ追加）→型定義→クエリ→サーバーアクション→UIコンポーネントの順に積み上げる。既存テーブルは一切変更しない。`supabase db reset` は絶対に使わない。

**Tech Stack:** Next.js 16 App Router（Server Components + Server Actions）、Supabase（PostgreSQL + RLS）、Tailwind CSS v4、TypeScript

---

## ファイル構成

| ファイル | 責務 |
|---------|------|
| `supabase/migrations/20260605200000_add_succession_plan_tables.sql` | 新規テーブル2つ + RLS ポリシー（既存テーブル変更なし） |
| `src/config/routes.ts` | `ADMIN_SUCCESSION` 定数を追加（修正） |
| `src/features/succession-plan/types.ts` | 準備度・リスク・ポジション・候補者の型定義 |
| `src/features/succession-plan/queries.ts` | SELECT 専用クエリ（ポジション + 候補者 + 従業員名の結合） |
| `src/features/succession-plan/actions.ts` | Server Actions（ポジション CRUD + 候補者 upsert/delete） |
| `src/features/succession-plan/components/PositionFormModal.tsx` | ポジション追加・編集モーダル |
| `src/features/succession-plan/components/CandidateFormModal.tsx` | 後継候補登録・編集モーダル |
| `src/features/succession-plan/components/PositionPanel.tsx` | ポジション一覧 + 候補者テーブル（タブ用パネル） |
| `src/features/succession-plan/components/NineBoxGrid.tsx` | 9-Box グリッドビュー（パフォーマンス × ポテンシャル） |
| `src/features/succession-plan/components/RiskPanel.tsx` | 後継者不在・Ready Now 不在ポジションのリスク一覧 |
| `src/features/succession-plan/components/SuccessionDashboard.tsx` | メインダッシュボード（タブ切替・KPI サマリー） |
| `src/app/(tenant)/(colored)/adm/(succession)/succession/page.tsx` | Server Component ページ（データ取得 → Client へ渡す） |
| `src/app/(tenant)/(colored)/adm/(succession)/succession/loading.tsx` | スケルトンローディング |
| `src/app/(tenant)/(colored)/adm/(succession)/succession/error.tsx` | エラー境界 |

---

### Task 1: DBマイグレーション

**Files:**
- Create: `supabase/migrations/20260605200000_add_succession_plan_tables.sql`

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- 既存テーブルは一切変更しない。新規テーブルのみ追加。
-- supabase db reset は絶対に使わない。supabase migration up のみ使う。

-- ────────────────────────────────────────────────
-- 重要ポジションマスタ
-- ────────────────────────────────────────────────
CREATE TABLE public.succession_positions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
  title             TEXT NOT NULL,
  division_id       UUID REFERENCES public.divisions(id),
  current_holder_id UUID REFERENCES public.employees(id),
  risk_level        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (risk_level IN ('high', 'medium', 'low')),
  notes             TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.succession_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.succession_positions
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_succession_positions_tenant
  ON public.succession_positions(tenant_id, sort_order);

-- ────────────────────────────────────────────────
-- 後継候補テーブル
-- ────────────────────────────────────────────────
CREATE TABLE public.succession_candidates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
  position_id         UUID NOT NULL REFERENCES public.succession_positions(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES public.employees(id),
  readiness           TEXT NOT NULL DEFAULT 'three_to_five_years'
                      CHECK (readiness IN ('ready_now', 'one_to_two_years', 'three_to_five_years')),
  performance_score   INTEGER NOT NULL DEFAULT 2
                      CHECK (performance_score BETWEEN 1 AND 3),
  potential_score     INTEGER NOT NULL DEFAULT 2
                      CHECK (potential_score BETWEEN 1 AND 3),
  development_actions TEXT,
  notes               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, employee_id)
);

ALTER TABLE public.succession_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.succession_candidates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_succession_candidates_position
  ON public.succession_candidates(position_id);

CREATE INDEX idx_succession_candidates_tenant_emp
  ON public.succession_candidates(tenant_id, employee_id);
```

- [ ] **Step 2: マイグレーションをローカルに適用する**

```bash
supabase migration up
```

期待出力: `Applying migration 20260605200000_add_succession_plan_tables.sql... done`

- [ ] **Step 3: テーブルが作成されたか確認する**

```bash
supabase db diff
```

期待出力: 差分なし（マイグレーション適用済み）

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260605200000_add_succession_plan_tables.sql
git commit -m "feat: add succession plan tables migration (P3-A)"
```

---

### Task 2: 型定義

**Files:**
- Create: `src/features/succession-plan/types.ts`

- [ ] **Step 1: types.ts を作成する**

```typescript
/** 準備度レベル */
export type ReadinessLevel = 'ready_now' | 'one_to_two_years' | 'three_to_five_years'

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  ready_now: 'Ready Now',
  one_to_two_years: '1〜2年後',
  three_to_five_years: '3〜5年後',
}

export const READINESS_COLORS: Record<ReadinessLevel, string> = {
  ready_now: 'bg-green-100 text-green-800',
  one_to_two_years: 'bg-yellow-100 text-yellow-800',
  three_to_five_years: 'bg-blue-100 text-blue-800',
}

/** ポジションリスクレベル */
export type PositionRiskLevel = 'high' | 'medium' | 'low'

export const RISK_LEVEL_LABELS: Record<PositionRiskLevel, string> = {
  high: '高リスク',
  medium: '中リスク',
  low: '低リスク',
}

export const RISK_LEVEL_COLORS: Record<PositionRiskLevel, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

/** 後継候補（一覧表示用） */
export interface CandidateRow {
  id: string
  position_id: string
  employee_id: string
  employee_name: string
  department_name: string | null
  readiness: ReadinessLevel
  performance_score: number
  potential_score: number
  development_actions: string | null
  notes: string | null
}

/** ポジション（候補者付き） */
export interface PositionWithCandidates {
  id: string
  title: string
  division_id: string | null
  division_name: string | null
  current_holder_id: string | null
  current_holder_name: string | null
  risk_level: PositionRiskLevel
  notes: string | null
  is_active: boolean
  candidates: CandidateRow[]
}

/** ダッシュボード全体データ */
export interface SuccessionDashboardData {
  positions: PositionWithCandidates[]
  noSuccessorCount: number
  readyNowCount: number
  totalCandidateCount: number
}

/** ポジション登録フォーム入力 */
export interface PositionFormInput {
  title: string
  division_id: string | null
  current_holder_id: string | null
  risk_level: PositionRiskLevel
  notes: string
}

/** 候補者登録フォーム入力 */
export interface CandidateFormInput {
  position_id: string
  employee_id: string
  readiness: ReadinessLevel
  performance_score: number
  potential_score: number
  development_actions: string
  notes: string
}

/** Server Action 戻り値 */
export type ActionResult = { success: true } | { success: false; error: string }

/** 従業員セレクト用 */
export interface EmployeeOption {
  id: string
  name: string
  department_name: string | null
}

/** 部署セレクト用 */
export interface DivisionOption {
  id: string
  name: string
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/types.ts
git commit -m "feat: add succession-plan types (P3-A)"
```

---

### Task 3: クエリ関数

**Files:**
- Create: `src/features/succession-plan/queries.ts`

- [ ] **Step 1: queries.ts を作成する**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  CandidateRow,
  PositionWithCandidates,
  SuccessionDashboardData,
} from './types'

const EMPTY: SuccessionDashboardData = {
  positions: [],
  noSuccessorCount: 0,
  readyNowCount: 0,
  totalCandidateCount: 0,
}

/** サクセッションプラン全データを取得する */
export async function getSuccessionDashboardData(): Promise<SuccessionDashboardData> {
  const user = await getServerUser()
  if (!user?.tenant_id) return EMPTY

  const supabase = await createClient()

  const { data: positionRows, error: posErr } = await supabase
    .from('succession_positions')
    .select('id, title, division_id, current_holder_id, risk_level, notes, is_active')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order')

  if (posErr || !positionRows || positionRows.length === 0) return EMPTY

  const positionIds = positionRows.map(p => p.id)

  const { data: candidateRows } = await supabase
    .from('succession_candidates')
    .select(
      'id, position_id, employee_id, readiness, performance_score, potential_score, development_actions, notes'
    )
    .in('position_id', positionIds)
    .order('sort_order')

  // 従業員情報を一括取得（現任者 + 候補者）
  const allEmployeeIds = [
    ...new Set([
      ...(positionRows.map(p => p.current_holder_id).filter(Boolean) as string[]),
      ...(candidateRows ?? []).map(c => c.employee_id),
    ]),
  ]

  const empMap = new Map<string, { name: string; department_name: string | null }>()

  if (allEmployeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name, division_id, divisions(name)')
      .in('id', allEmployeeIds)
      .eq('tenant_id', user.tenant_id)

    for (const e of employees ?? []) {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData)
        ? (divData[0]?.name ?? null)
        : (divData?.name ?? null)
      empMap.set(e.id, { name: e.name ?? '', department_name: deptName })
    }
  }

  // 部署名を一括取得
  const divisionIds = positionRows
    .map(p => p.division_id)
    .filter(Boolean) as string[]
  const divMap = new Map<string, string>()

  if (divisionIds.length > 0) {
    const { data: divisions } = await supabase
      .from('divisions')
      .select('id, name')
      .in('id', divisionIds)

    for (const d of divisions ?? []) {
      divMap.set(d.id, d.name)
    }
  }

  // ポジションごとに候補者をグループ化
  const candidatesByPosition = new Map<string, CandidateRow[]>()
  for (const c of candidateRows ?? []) {
    const emp = empMap.get(c.employee_id)
    const row: CandidateRow = {
      id: c.id,
      position_id: c.position_id,
      employee_id: c.employee_id,
      employee_name: emp?.name ?? '（不明）',
      department_name: emp?.department_name ?? null,
      readiness: c.readiness as CandidateRow['readiness'],
      performance_score: c.performance_score,
      potential_score: c.potential_score,
      development_actions: c.development_actions,
      notes: c.notes,
    }
    const list = candidatesByPosition.get(c.position_id) ?? []
    list.push(row)
    candidatesByPosition.set(c.position_id, list)
  }

  const positions: PositionWithCandidates[] = positionRows.map(p => {
    const candidates = candidatesByPosition.get(p.id) ?? []
    const holder = p.current_holder_id ? empMap.get(p.current_holder_id) : null
    return {
      id: p.id,
      title: p.title,
      division_id: p.division_id,
      division_name: p.division_id ? (divMap.get(p.division_id) ?? null) : null,
      current_holder_id: p.current_holder_id,
      current_holder_name: holder?.name ?? null,
      risk_level: p.risk_level as PositionWithCandidates['risk_level'],
      notes: p.notes,
      is_active: p.is_active,
      candidates,
    }
  })

  return {
    positions,
    noSuccessorCount: positions.filter(p => p.candidates.length === 0).length,
    readyNowCount: positions.filter(p => p.candidates.some(c => c.readiness === 'ready_now')).length,
    totalCandidateCount: positions.reduce((sum, p) => sum + p.candidates.length, 0),
  }
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/queries.ts
git commit -m "feat: add succession-plan queries (P3-A)"
```

---

### Task 4: サーバーアクション

**Files:**
- Create: `src/features/succession-plan/actions.ts`

- [ ] **Step 1: actions.ts を作成する**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import type { PositionFormInput, CandidateFormInput, ActionResult } from './types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

async function authorizeHr() {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')
  return user
}

/** ポジションを新規作成する */
export async function createPosition(input: PositionFormInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase.from('succession_positions').insert({
      tenant_id: user.tenant_id,
      title: input.title.trim(),
      division_id: input.division_id || null,
      current_holder_id: input.current_holder_id || null,
      risk_level: input.risk_level,
      notes: input.notes.trim() || null,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** ポジションを更新する */
export async function updatePosition(
  id: string,
  input: PositionFormInput
): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase
      .from('succession_positions')
      .update({
        title: input.title.trim(),
        division_id: input.division_id || null,
        current_holder_id: input.current_holder_id || null,
        risk_level: input.risk_level,
        notes: input.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** ポジションを非アクティブ化する（論理削除） */
export async function deactivatePosition(id: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase
      .from('succession_positions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 後継候補を登録または更新する（position_id + employee_id でユニーク） */
export async function upsertCandidate(input: CandidateFormInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase.from('succession_candidates').upsert(
      {
        tenant_id: user.tenant_id,
        position_id: input.position_id,
        employee_id: input.employee_id,
        readiness: input.readiness,
        performance_score: input.performance_score,
        potential_score: input.potential_score,
        development_actions: input.development_actions.trim() || null,
        notes: input.notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'position_id,employee_id', ignoreDuplicates: false }
    )

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 後継候補を削除する */
export async function deleteCandidate(id: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase
      .from('succession_candidates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/actions.ts
git commit -m "feat: add succession-plan server actions (P3-A)"
```

---

### Task 5: PositionFormModal（ポジション追加・編集モーダル）

**Files:**
- Create: `src/features/succession-plan/components/PositionFormModal.tsx`

- [ ] **Step 1: PositionFormModal.tsx を作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createPosition, updatePosition } from '../actions'
import type {
  PositionWithCandidates,
  PositionFormInput,
  PositionRiskLevel,
  EmployeeOption,
  DivisionOption,
} from '../types'
import { RISK_LEVEL_LABELS } from '../types'

interface Props {
  position?: PositionWithCandidates | null
  employees: EmployeeOption[]
  divisions: DivisionOption[]
  onClose: () => void
}

const RISK_LEVELS: PositionRiskLevel[] = ['high', 'medium', 'low']

export function PositionFormModal({ position, employees, divisions, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<PositionFormInput>({
    title: position?.title ?? '',
    division_id: position?.division_id ?? null,
    current_holder_id: position?.current_holder_id ?? null,
    risk_level: position?.risk_level ?? 'medium',
    notes: position?.notes ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('ポジション名を入力してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = position
        ? await updatePosition(position.id, form)
        : await createPosition(form)

      if (!result.success) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {position ? 'ポジション編集' : 'ポジション追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ポジション名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例: 営業部長、技術マネージャー"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">担当部署</label>
            <select
              value={form.division_id ?? ''}
              onChange={e => setForm(f => ({ ...f, division_id: e.target.value || null }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">（指定なし）</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">現任者</label>
            <select
              value={form.current_holder_id ?? ''}
              onChange={e =>
                setForm(f => ({ ...f, current_holder_id: e.target.value || null }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">（指定なし）</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.department_name ? ` (${e.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">リスクレベル</label>
            <div className="flex gap-2">
              {RISK_LEVELS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, risk_level: r }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.risk_level === r
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {RISK_LEVEL_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="ポジションの説明や特記事項"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '保存中…' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/components/PositionFormModal.tsx
git commit -m "feat: add PositionFormModal component (P3-A)"
```

---

### Task 6: CandidateFormModal（候補者登録・編集モーダル）

**Files:**
- Create: `src/features/succession-plan/components/CandidateFormModal.tsx`

- [ ] **Step 1: CandidateFormModal.tsx を作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { upsertCandidate } from '../actions'
import type {
  CandidateRow,
  CandidateFormInput,
  ReadinessLevel,
  EmployeeOption,
  PositionWithCandidates,
} from '../types'
import { READINESS_LABELS } from '../types'

interface Props {
  position: PositionWithCandidates
  candidate?: CandidateRow | null
  employees: EmployeeOption[]
  onClose: () => void
}

const READINESS_OPTIONS: ReadinessLevel[] = [
  'ready_now',
  'one_to_two_years',
  'three_to_five_years',
]
const SCORE_OPTIONS = [1, 2, 3] as const
const SCORE_LABELS = ['低', '中', '高'] as const

export function CandidateFormModal({ position, candidate, employees, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CandidateFormInput>({
    position_id: position.id,
    employee_id: candidate?.employee_id ?? '',
    readiness: candidate?.readiness ?? 'three_to_five_years',
    performance_score: candidate?.performance_score ?? 2,
    potential_score: candidate?.potential_score ?? 2,
    development_actions: candidate?.development_actions ?? '',
    notes: candidate?.notes ?? '',
  })

  // 既登録済みの従業員を除外（編集中は自分自身を除外しない）
  const registeredIds = new Set(position.candidates.map(c => c.employee_id))
  if (candidate) registeredIds.delete(candidate.employee_id)
  const availableEmployees = employees.filter(e => !registeredIds.has(e.id))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) {
      setError('候補者を選択してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await upsertCandidate(form)
      if (!result.success) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">後継候補の登録</h2>
            <p className="text-sm text-gray-500">{position.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              候補者 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              disabled={!!candidate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">（選択してください）</option>
              {availableEmployees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.department_name ? ` (${e.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">準備度</label>
            <div className="flex gap-2">
              {READINESS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, readiness: r }))}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    form.readiness === r
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {READINESS_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                パフォーマンス
              </label>
              <div className="flex gap-1">
                {SCORE_OPTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, performance_score: s }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      form.performance_score === s
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SCORE_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ポテンシャル
              </label>
              <div className="flex gap-1">
                {SCORE_OPTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, potential_score: s }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      form.potential_score === s
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SCORE_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">育成アクション</label>
            <textarea
              value={form.development_actions}
              onChange={e => setForm(f => ({ ...f, development_actions: e.target.value }))}
              rows={2}
              placeholder="例: 月1回の1on1、部門横断プロジェクトへのアサイン"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="特記事項"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '保存中…' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/components/CandidateFormModal.tsx
git commit -m "feat: add CandidateFormModal component (P3-A)"
```

---

### Task 7: NineBoxGrid（9-Boxグリッドビュー）

**Files:**
- Create: `src/features/succession-plan/components/NineBoxGrid.tsx`

- [ ] **Step 1: NineBoxGrid.tsx を作成する**

```tsx
'use client'

import type { CandidateRow } from '../types'
import { READINESS_COLORS, READINESS_LABELS } from '../types'

interface Props {
  candidates: CandidateRow[]
  positionTitleMap: Map<string, string>
}

// key: "performance_score,potential_score"
const BOX_LABELS: Record<string, string> = {
  '3,3': 'スター',
  '2,3': 'ハイポテンシャル',
  '1,3': '伸び代あり',
  '3,2': '優秀貢献者',
  '2,2': 'コア人材',
  '1,2': '要育成',
  '3,1': '熟達者',
  '2,1': '安定貢献者',
  '1,1': '要注意',
}

const BOX_BG: Record<string, string> = {
  '3,3': 'bg-green-50 border-green-200',
  '2,3': 'bg-emerald-50 border-emerald-200',
  '1,3': 'bg-teal-50 border-teal-200',
  '3,2': 'bg-blue-50 border-blue-200',
  '2,2': 'bg-gray-50 border-gray-200',
  '1,2': 'bg-orange-50 border-orange-200',
  '3,1': 'bg-purple-50 border-purple-200',
  '2,1': 'bg-yellow-50 border-yellow-200',
  '1,1': 'bg-red-50 border-red-200',
}

export function NineBoxGrid({ candidates, positionTitleMap }: Props) {
  function renderBox(perf: number, poten: number) {
    const key = `${perf},${poten}`
    const boxCandidates = candidates.filter(
      c => c.performance_score === perf && c.potential_score === poten
    )

    return (
      <div key={key} className={`min-h-28 rounded-lg border p-3 ${BOX_BG[key]}`}>
        <p className="mb-2 text-[11px] font-semibold text-gray-600">{BOX_LABELS[key]}</p>
        {boxCandidates.length === 0 ? (
          <p className="text-xs text-gray-400">—</p>
        ) : (
          <div className="space-y-1.5">
            {boxCandidates.map(c => (
              <div key={c.id} className="text-xs">
                <span className="font-medium text-gray-800">{c.employee_name}</span>
                {positionTitleMap.has(c.position_id) && (
                  <span className="ml-1 text-gray-500">
                    ({positionTitleMap.get(c.position_id)})
                  </span>
                )}
                <br />
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${READINESS_COLORS[c.readiness]}`}
                >
                  {READINESS_LABELS[c.readiness]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">9-Box グリッド</h3>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>横軸: パフォーマンス →</span>
          <span>縦軸: ポテンシャル ↑</span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Y軸ラベル */}
        <div className="flex w-6 flex-col justify-between py-2 text-center text-[10px] font-medium text-gray-400">
          <span>高</span>
          <span>中</span>
          <span>低</span>
        </div>

        <div className="flex-1">
          {/* グリッド（縦: poten 3→1、横: perf 1→3）*/}
          <div className="grid grid-cols-3 gap-2">
            {renderBox(1, 3)}
            {renderBox(2, 3)}
            {renderBox(3, 3)}
            {renderBox(1, 2)}
            {renderBox(2, 2)}
            {renderBox(3, 2)}
            {renderBox(1, 1)}
            {renderBox(2, 1)}
            {renderBox(3, 1)}
          </div>

          {/* X軸ラベル */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-medium text-gray-400">
            <span>低</span>
            <span>中</span>
            <span>高</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/components/NineBoxGrid.tsx
git commit -m "feat: add NineBoxGrid component (P3-A)"
```

---

### Task 8: RiskPanel（キーパーソン依存リスクパネル）

**Files:**
- Create: `src/features/succession-plan/components/RiskPanel.tsx`

- [ ] **Step 1: RiskPanel.tsx を作成する**

```tsx
'use client'

import type { PositionWithCandidates } from '../types'
import {
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  READINESS_COLORS,
  READINESS_LABELS,
} from '../types'

interface Props {
  positions: PositionWithCandidates[]
}

export function RiskPanel({ positions }: Props) {
  const noSuccessor = positions.filter(p => p.candidates.length === 0)
  const noReadyNow = positions.filter(
    p => p.candidates.length > 0 && !p.candidates.some(c => c.readiness === 'ready_now')
  )

  return (
    <div className="space-y-8">
      {/* 後継者不在ポジション */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold">
            !
          </span>
          後継者不在ポジション
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            {noSuccessor.length} 件
          </span>
        </h3>

        {noSuccessor.length === 0 ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            すべてのポジションに後継候補が登録されています。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-red-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">ポジション</th>
                  <th className="px-4 py-2 font-medium">部署</th>
                  <th className="px-4 py-2 font-medium">現任者</th>
                  <th className="px-4 py-2 font-medium">リスク設定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {noSuccessor.map(p => (
                  <tr key={p.id} className="bg-white transition-colors hover:bg-red-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.division_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.current_holder_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLORS[p.risk_level]}`}
                      >
                        {RISK_LEVEL_LABELS[p.risk_level]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ready Now 候補不在ポジション */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-700">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold">
            △
          </span>
          Ready Now 候補不在ポジション
          <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
            {noReadyNow.length} 件
          </span>
        </h3>

        {noReadyNow.length === 0 ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            すべてのポジションに Ready Now 候補がいます。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-yellow-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-yellow-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">ポジション</th>
                  <th className="px-4 py-2 font-medium">最短候補者</th>
                  <th className="px-4 py-2 font-medium">候補者数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {noReadyNow.map(p => {
                  const shortestCandidate =
                    p.candidates.find(c => c.readiness === 'one_to_two_years') ??
                    p.candidates[0]
                  return (
                    <tr key={p.id} className="bg-white transition-colors hover:bg-yellow-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                      <td className="px-4 py-3">
                        {shortestCandidate ? (
                          <span>
                            {shortestCandidate.employee_name}
                            <span
                              className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${READINESS_COLORS[shortestCandidate.readiness]}`}
                            >
                              {READINESS_LABELS[shortestCandidate.readiness]}
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.candidates.length} 名</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/components/RiskPanel.tsx
git commit -m "feat: add RiskPanel component (P3-A)"
```

---

### Task 9: PositionPanel（ポジション一覧・候補者管理）

**Files:**
- Create: `src/features/succession-plan/components/PositionPanel.tsx`

- [ ] **Step 1: PositionPanel.tsx を作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { deactivatePosition, deleteCandidate } from '../actions'
import { PositionFormModal } from './PositionFormModal'
import { CandidateFormModal } from './CandidateFormModal'
import type {
  PositionWithCandidates,
  CandidateRow,
  EmployeeOption,
  DivisionOption,
} from '../types'
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, READINESS_LABELS, READINESS_COLORS } from '../types'

interface Props {
  positions: PositionWithCandidates[]
  employees: EmployeeOption[]
  divisions: DivisionOption[]
  onAddPosition: () => void
}

export function PositionPanel({ positions, employees, divisions, onAddPosition }: Props) {
  const [, startTransition] = useTransition()
  const [editingPosition, setEditingPosition] = useState<PositionWithCandidates | null>(null)
  const [addingCandidateTo, setAddingCandidateTo] = useState<PositionWithCandidates | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<{
    position: PositionWithCandidates
    candidate: CandidateRow
  } | null>(null)

  function handleDeactivate(positionId: string) {
    if (!confirm('このポジションを非表示にしますか？')) return
    startTransition(async () => {
      await deactivatePosition(positionId)
    })
  }

  function handleDeleteCandidate(candidateId: string) {
    if (!confirm('この候補者登録を削除しますか？')) return
    startTransition(async () => {
      await deleteCandidate(candidateId)
    })
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-500">重要ポジションがまだ登録されていません。</p>
        <button
          onClick={onAddPosition}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + ポジションを追加
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {positions.map(position => (
          <div
            key={position.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            {/* ポジションヘッダー */}
            <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{position.title}</h3>
                {position.division_name && (
                  <span className="text-xs text-gray-500">{position.division_name}</span>
                )}
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLORS[position.risk_level]}`}
                >
                  {RISK_LEVEL_LABELS[position.risk_level]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {position.current_holder_name && (
                  <span className="text-xs text-gray-500">
                    現任: {position.current_holder_name}
                  </span>
                )}
                <button
                  onClick={() => setEditingPosition(position)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeactivate(position.id)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  非表示
                </button>
              </div>
            </div>

            {/* 候補者一覧 */}
            <div className="p-4">
              {position.candidates.length === 0 ? (
                <p className="text-sm text-gray-400">候補者が未登録です</p>
              ) : (
                <div className="mb-3 overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500">
                        <th className="px-4 py-2 font-medium">候補者</th>
                        <th className="px-4 py-2 font-medium">部署</th>
                        <th className="px-4 py-2 font-medium">準備度</th>
                        <th className="px-4 py-2 text-center font-medium">パフォーマンス</th>
                        <th className="px-4 py-2 text-center font-medium">ポテンシャル</th>
                        <th className="px-4 py-2 font-medium">育成アクション</th>
                        <th className="px-4 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {position.candidates.map(c => (
                        <tr key={c.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {c.employee_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.department_name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${READINESS_COLORS[c.readiness]}`}
                            >
                              {READINESS_LABELS[c.readiness]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {'●'.repeat(c.performance_score)}
                            {'○'.repeat(3 - c.performance_score)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {'●'.repeat(c.potential_score)}
                            {'○'.repeat(3 - c.potential_score)}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-xs text-gray-600">
                            {c.development_actions ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  setEditingCandidate({ position, candidate: c })
                                }
                                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDeleteCandidate(c.id)}
                                className="rounded border border-gray-200 px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => setAddingCandidateTo(position)}
                className="rounded-lg border border-dashed border-blue-300 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-50"
              >
                + 候補者を追加
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingPosition && (
        <PositionFormModal
          position={editingPosition}
          employees={employees}
          divisions={divisions}
          onClose={() => setEditingPosition(null)}
        />
      )}

      {addingCandidateTo && (
        <CandidateFormModal
          position={addingCandidateTo}
          employees={employees}
          onClose={() => setAddingCandidateTo(null)}
        />
      )}

      {editingCandidate && (
        <CandidateFormModal
          position={editingCandidate.position}
          candidate={editingCandidate.candidate}
          employees={employees}
          onClose={() => setEditingCandidate(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/components/PositionPanel.tsx
git commit -m "feat: add PositionPanel component (P3-A)"
```

---

### Task 10: SuccessionDashboard（メインダッシュボード）

**Files:**
- Create: `src/features/succession-plan/components/SuccessionDashboard.tsx`

- [ ] **Step 1: SuccessionDashboard.tsx を作成する**

```tsx
'use client'

import { useState } from 'react'
import { PositionFormModal } from './PositionFormModal'
import { PositionPanel } from './PositionPanel'
import { NineBoxGrid } from './NineBoxGrid'
import { RiskPanel } from './RiskPanel'
import type { SuccessionDashboardData, EmployeeOption, DivisionOption } from '../types'

interface Props {
  data: SuccessionDashboardData
  employees: EmployeeOption[]
  divisions: DivisionOption[]
}

type TabId = 'positions' | 'nine_box' | 'risk'

const TABS: { id: TabId; label: string }[] = [
  { id: 'positions', label: 'ポジション管理' },
  { id: 'nine_box', label: '9-Box グリッド' },
  { id: 'risk', label: '依存リスク' },
]

export function SuccessionDashboard({ data, employees, divisions }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('positions')
  const [addPositionOpen, setAddPositionOpen] = useState(false)

  const allCandidates = data.positions.flatMap(p => p.candidates)
  const positionTitleMap = new Map(data.positions.map(p => [p.id, p.title]))

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/succession — サクセッションプラン
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              サクセッションプラン（後継者管理）
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              重要ポジションの後継候補を管理し、組織の継続性リスクを可視化する
            </p>
          </div>
          <button
            onClick={() => setAddPositionOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            + ポジションを追加
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* KPI サマリーカード */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                重要ポジション数
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.positions.length}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                data.noSuccessorCount > 0
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                後継者不在
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  data.noSuccessorCount > 0 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {data.noSuccessorCount}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">ポジション</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Ready Now 候補あり
              </p>
              <p className="mt-2 text-3xl font-bold text-green-600">{data.readyNowCount}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                ポジション（全 {data.positions.length} 中）
              </p>
            </div>
          </div>

          {/* タブ */}
          <div>
            <div className="flex border-b border-gray-200">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {activeTab === 'positions' && (
                <PositionPanel
                  positions={data.positions}
                  employees={employees}
                  divisions={divisions}
                  onAddPosition={() => setAddPositionOpen(true)}
                />
              )}
              {activeTab === 'nine_box' &&
                (allCandidates.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">
                    候補者が登録されていません
                  </p>
                ) : (
                  <NineBoxGrid
                    candidates={allCandidates}
                    positionTitleMap={positionTitleMap}
                  />
                ))}
              {activeTab === 'risk' && <RiskPanel positions={data.positions} />}
            </div>
          </div>
        </div>
      </div>

      {addPositionOpen && (
        <PositionFormModal
          employees={employees}
          divisions={divisions}
          onClose={() => setAddPositionOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/succession-plan/components/SuccessionDashboard.tsx
git commit -m "feat: add SuccessionDashboard component (P3-A)"
```

---

### Task 11: ページルーティングと routes.ts 更新

**Files:**
- Modify: `src/config/routes.ts`
- Create: `src/app/(tenant)/(colored)/adm/(succession)/succession/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(succession)/succession/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(succession)/succession/error.tsx`

- [ ] **Step 1: routes.ts に ADMIN_SUCCESSION を追加する**

`src/config/routes.ts` の `TENANT` ブロック内、`ADMIN_LIFECYCLE: '/adm/lifecycle',` の直後の行に追加する：

```typescript
    /** サクセッションプラン（P3-A） */
    ADMIN_SUCCESSION: '/adm/succession',
```

- [ ] **Step 2: page.tsx を作成する**

ファイルパス: `src/app/(tenant)/(colored)/adm/(succession)/succession/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getSuccessionDashboardData } from '@/features/succession-plan/queries'
import { SuccessionDashboard } from '@/features/succession-plan/components/SuccessionDashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'サクセッションプラン' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function SuccessionPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const supabase = await createClient()

  const { data: empRows } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .order('name')

  const employees = (empRows ?? []).map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData)
      ? (divData[0]?.name ?? null)
      : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })

  const { data: divRows } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  const divisions = (divRows ?? []).map(d => ({ id: d.id, name: d.name }))

  const data = await getSuccessionDashboardData()

  return <SuccessionDashboard data={data} employees={employees} divisions={divisions} />
}
```

- [ ] **Step 3: loading.tsx を作成する**

ファイルパス: `src/app/(tenant)/(colored)/adm/(succession)/succession/loading.tsx`

```typescript
export default function SuccessionLoading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-10 animate-pulse bg-gray-100" />
        <div className="h-24 animate-pulse bg-gray-200" />
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-8 w-72 animate-pulse rounded bg-gray-100" />
          <div className="h-96 animate-pulse rounded-xl bg-gray-50" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: error.tsx を作成する**

ファイルパス: `src/app/(tenant)/(colored)/adm/(succession)/succession/error.tsx`

```typescript
'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SuccessionError({ error, reset }: Props) {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-red-600">エラーが発生しました</p>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 型チェックを実行する**

```bash
npm run type-check
```

期待出力: エラーなし（または succession-plan に関係しないエラーのみ）

- [ ] **Step 6: コミット**

```bash
git add src/config/routes.ts \
  "src/app/(tenant)/(colored)/adm/(succession)/succession/page.tsx" \
  "src/app/(tenant)/(colored)/adm/(succession)/succession/loading.tsx" \
  "src/app/(tenant)/(colored)/adm/(succession)/succession/error.tsx"
git commit -m "feat: add succession plan page route (P3-A)"
```

---

### Task 12: 動作確認

- [ ] **Step 1: 開発サーバーを起動する**

```bash
npm run dev
```

- [ ] **Step 2: ブラウザで `/adm/succession` にアクセスして確認する**

確認項目（この順番で手動テスト）:

1. ページが正常に表示される（空状態：「重要ポジションがまだ登録されていません」）
2. ヘッダーの「+ ポジションを追加」をクリック → PositionFormModal が開く
3. ポジション名「営業部長」・リスク「高リスク」で保存 → モーダルが閉じてポジションが一覧に表示される
4. ポジションカードの「+ 候補者を追加」をクリック → CandidateFormModal が開く
5. 従業員を選択・準備度「1〜2年後」・パフォーマンス「高」・ポテンシャル「中」で保存
6. 候補者が一覧テーブルに表示される（名前・準備度バッジ・スコア）
7. タブ「9-Box グリッド」に切り替え → 候補者が「優秀貢献者」セルに表示される
8. タブ「依存リスク」に切り替え → Ready Now 不在ポジションが黄色テーブルに表示される
9. 候補者の「編集」をクリック → 既存値がフォームに反映される
10. 候補者の「削除」→ confirm ダイアログ → 削除後に一覧から消える
11. KPI サマリーカードの数値が正しく更新されている

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "feat: complete succession plan (P3-A)"
```

---

## 自己レビュー

### 仕様カバレッジ

| 仕様要件 | 対応タスク |
|---------|-----------|
| 重要ポジションマスタ管理（部長・課長・専門職） | Task 1 DB + Task 5 PositionFormModal + Task 9 PositionPanel |
| 後継候補の登録と準備度スコア（Ready Now / 1〜2年後 / 3〜5年後） | Task 1 DB + Task 6 CandidateFormModal |
| 9-Box グリッドビュー（パフォーマンス × ポテンシャル） | Task 7 NineBoxGrid |
| 候補者の育成アクションリンク（1on1・研修・配置転換） | Task 6 `development_actions` フィールド |
| キーパーソン依存リスクの可視化 | Task 8 RiskPanel |

### 型一貫性チェック

- `PositionWithCandidates.division_id` → Task 3 queries.ts でセット → Task 5 PositionFormModal の `form.division_id` で参照 ✓
- `CandidateRow.readiness` → `ReadinessLevel` 型 → Task 7 NineBoxGrid の `READINESS_COLORS[c.readiness]` で参照 ✓
- `upsertCandidate` の `onConflict: 'position_id,employee_id'` → Task 1 DB の `UNIQUE (position_id, employee_id)` と一致 ✓
- `deactivatePosition` は `is_active: false` の論理削除 → 既存データを絶対に消さない ✓
- `employees` テーブルの RLS ポリシーは `user_id = auth.uid()` → 既存マイグレーションのパターンと一致 ✓

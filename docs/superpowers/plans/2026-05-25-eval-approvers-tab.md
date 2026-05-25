# 評価者設定タブ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 承認者マスタ管理画面（`/adm/skill-map/approvers`）にタブを追加し、一次評価者・二次評価者・確定者を従業員ごとに設定・管理できる UI を実装する。

**Architecture:** 既存の `ApproversManager`（スキル承認タブ）は変更せず、タブ切り替え UI を外側に追加する。評価者設定タブは新規 `EvalApproversManager` コンポーネントに完全に分離し、`features/skill-portal` の queries / actions / types に評価者専用の関数と型を追加する。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase（RLS有効）, Tailwind CSS v4, Server Actions

---

### Task 1: 型定義を追加する

**Files:**
- Modify: `src/features/skill-portal/types.ts:69-77`

- [ ] **Step 1: `SkillApprover` に `approver_role` を追加し、`EvalApproverRow` 型を新規追加する**

`src/features/skill-portal/types.ts` の `SkillApprover` 型（69行目付近）を以下に変更し、その後に `EvalApproverRow` 型を追加する：

```ts
export type SkillApprover = {
  id: string
  tenant_id: string
  employee_id: string
  approver_id: string
  approver_role: string
  created_at: string
  employee?: { id: string; name: string | null; employee_no: string | null }
  approver?: { id: string; name: string | null; employee_no: string | null }
}

type EvalApproverPerson = {
  id: string
  approver_id: string
  approver: { id: string; name: string | null; employee_no: string | null }
}

export type EvalApproverRow = {
  employee_id: string
  employee: { id: string; name: string | null; employee_no: string | null }
  primary: EvalApproverPerson | null
  secondary: EvalApproverPerson | null
  confirmer: EvalApproverPerson | null
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -30
```

期待結果: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/skill-portal/types.ts
git commit -m "feat: 評価者設定用の型定義を追加"
```

---

### Task 2: クエリ関数 `getEvalApprovers` を追加する

**Files:**
- Modify: `src/features/skill-portal/queries.ts`（末尾に追加）

- [ ] **Step 1: import に `EvalApproverRow` を追加し、`getEvalApprovers` 関数をファイル末尾に追加する**

ファイル冒頭のインポートを以下に変更する：

```ts
import type {
  SkillRoleApplication,
  SkillRequirementApplication,
  SkillApprover,
  EvalApproverRow,
  TeamMemberGrowthCard,
  GrowthJourneyData,
  SkillGrowthMilestone,
  SkillConsultation,
} from './types'
```

ファイル末尾（398行目以降）に以下を追加する：

```ts
/** 評価者設定一覧（従業員ごとに3役を集約） */
export async function getEvalApprovers(supabase: DB): Promise<EvalApproverRow[]> {
  const { data, error } = await (supabase as any)
    .from('employee_approvers')
    .select(
      'id, employee_id, approver_id, approver_role, employee:employees!employee_approvers_employee_id_fkey(id, name, employee_no), approver:employees!employee_approvers_approver_id_fkey(id, name, employee_no)'
    )
    .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as Array<{
    id: string
    employee_id: string
    approver_id: string
    approver_role: string
    employee: { id: string; name: string | null; employee_no: string | null }
    approver: { id: string; name: string | null; employee_no: string | null }
  }>

  const map = new Map<string, EvalApproverRow>()
  for (const row of rows) {
    if (!map.has(row.employee_id)) {
      map.set(row.employee_id, {
        employee_id: row.employee_id,
        employee: row.employee,
        primary: null,
        secondary: null,
        confirmer: null,
      })
    }
    const entry = map.get(row.employee_id)!
    const person = { id: row.id, approver_id: row.approver_id, approver: row.approver }
    if (row.approver_role === 'eval_primary') entry.primary = person
    if (row.approver_role === 'eval_secondary') entry.secondary = person
    if (row.approver_role === 'eval_confirmer') entry.confirmer = person
  }

  return Array.from(map.values()).sort((a, b) => {
    const na = a.employee?.employee_no ?? ''
    const nb = b.employee?.employee_no ?? ''
    return na.localeCompare(nb, 'ja', { numeric: true })
  })
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -30
```

期待結果: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/skill-portal/queries.ts
git commit -m "feat: getEvalApprovers クエリを追加"
```

---

### Task 3: Server Actions `upsertEvalApprovers` / `removeEvalApprovers` を追加する

**Files:**
- Modify: `src/features/skill-portal/actions.ts`（末尾に追加）

- [ ] **Step 1: `upsertEvalApprovers` と `removeEvalApprovers` をファイル末尾に追加する**

`actions.ts` の末尾（850行目以降）に追加する：

```ts
// ---- 人事: 評価者設定 upsert ----

export async function upsertEvalApprovers(input: {
  employeeId: string
  primaryApproverId: string | null
  secondaryApproverId: string | null
  confirmerApproverId: string | null
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error: delErr } = await (supabase as any)
    .from('employee_approvers')
    .delete()
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', input.employeeId)
    .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])
  if (delErr) return { success: false, error: delErr.message }

  const inserts: Array<{ tenant_id: string; employee_id: string; approver_id: string; approver_role: string }> = []
  if (input.primaryApproverId) {
    inserts.push({ tenant_id: user.tenant_id, employee_id: input.employeeId, approver_id: input.primaryApproverId, approver_role: 'eval_primary' })
  }
  if (input.secondaryApproverId) {
    inserts.push({ tenant_id: user.tenant_id, employee_id: input.employeeId, approver_id: input.secondaryApproverId, approver_role: 'eval_secondary' })
  }
  if (input.confirmerApproverId) {
    inserts.push({ tenant_id: user.tenant_id, employee_id: input.employeeId, approver_id: input.confirmerApproverId, approver_role: 'eval_confirmer' })
  }

  if (inserts.length > 0) {
    const { error: insErr } = await (supabase as any).from('employee_approvers').insert(inserts)
    if (insErr) return { success: false, error: insErr.message }
  }

  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}

// ---- 人事: 評価者設定 一括削除 ----

export async function removeEvalApprovers(input: {
  employeeId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('employee_approvers')
    .delete()
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', input.employeeId)
    .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])
  if (error) return { success: false, error: error.message }

  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -30
```

期待結果: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/skill-portal/actions.ts
git commit -m "feat: upsertEvalApprovers / removeEvalApprovers アクションを追加"
```

---

### Task 4: `EvalApproversManager` コンポーネントを新規作成する

**Files:**
- Create: `src/features/skill-portal/components/EvalApproversManager.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import type { EvalApproverRow } from '../types'
import { upsertEvalApprovers, removeEvalApprovers } from '../actions'

type Employee = { id: string; name: string | null; employee_no: string | null }

type Props = {
  rows: EvalApproverRow[]
  allEmployees: Employee[]
}

function empLabel(e: Employee) {
  const name = e.name?.trim() ?? '—'
  return e.employee_no ? `${name}（${e.employee_no}）` : name
}

export function EvalApproversManager({ rows, allEmployees }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [primaryId, setPrimaryId] = useState('')
  const [secondaryId, setSecondaryId] = useState('')
  const [confirmerId, setConfirmerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!employeeId) {
      setError('対象従業員を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await upsertEvalApprovers({
        employeeId,
        primaryApproverId: primaryId || null,
        secondaryApproverId: secondaryId || null,
        confirmerApproverId: confirmerId || null,
      })
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      setEmployeeId('')
      setPrimaryId('')
      setSecondaryId('')
      setConfirmerId('')
    })
  }

  function handleRemove(empId: string) {
    startTransition(async () => {
      await removeEvalApprovers({ employeeId: empId })
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">対象従業員</label>
            <select
              value={employeeId}
              onChange={e => { setEmployeeId(e.target.value); setError(null) }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">一次評価者</label>
            <select
              value={primaryId}
              onChange={e => setPrimaryId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">（なし）</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">二次評価者</label>
            <select
              value={secondaryId}
              onChange={e => setSecondaryId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">（なし）</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">確定者（最終）</label>
            <select
              value={confirmerId}
              onChange={e => setConfirmerId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">（なし）</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            保存
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">評価者が設定されていません</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-10 border-b border-gray-200 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">No</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">従業員</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">一次評価者</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">二次評価者</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">確定者</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-center text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.employee_id}
                  className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="w-10 px-2 py-2.5 text-center font-mono text-xs text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.employee.name ?? '—'}
                    {row.employee.employee_no && (
                      <span className="ml-1 font-mono text-xs text-gray-400">（{row.employee.employee_no}）</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.primary ? (
                      <>
                        {row.primary.approver.name ?? '—'}
                        {row.primary.approver.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{row.primary.approver.employee_no}）</span>
                        )}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.secondary ? (
                      <>
                        {row.secondary.approver.name ?? '—'}
                        {row.secondary.approver.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{row.secondary.approver.employee_no}）</span>
                        )}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.confirmer ? (
                      <>
                        {row.confirmer.approver.name ?? '—'}
                        {row.confirmer.approver.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{row.confirmer.approver.employee_no}）</span>
                        )}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(row.employee_id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -30
```

期待結果: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/skill-portal/components/EvalApproversManager.tsx
git commit -m "feat: EvalApproversManager コンポーネントを新規作成"
```

---

### Task 5: `ApproversManager` にタブ UI を追加する

**Files:**
- Modify: `src/features/skill-portal/components/ApproversManager.tsx`（全体を置き換え）

- [ ] **Step 1: ファイル全体を以下に置き換える**

既存のスキル承認ロジックは内部の `SkillApproversTab` 関数コンポーネントに移動し、外側にタブ切り替え UI を追加する：

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { SkillApprover, EvalApproverRow } from '../types'
import { addSkillApprover, removeSkillApprover } from '../actions'
import { EvalApproversManager } from './EvalApproversManager'

type Employee = { id: string; name: string | null; employee_no: string | null }

type Props = {
  approvers: SkillApprover[]
  allEmployees: Employee[]
  evalRows: EvalApproverRow[]
  activeTab: 'skill' | 'eval'
}

export function ApproversManager({ approvers, allEmployees, evalRows, activeTab }: Props) {
  const router = useRouter()

  function switchTab(tab: 'skill' | 'eval') {
    const params = new URLSearchParams()
    if (tab === 'eval') params.set('tab', 'eval')
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => switchTab('skill')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'skill'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          スキル承認者
        </button>
        <button
          type="button"
          onClick={() => switchTab('eval')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'eval'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          評価者設定
        </button>
      </div>

      {activeTab === 'skill' ? (
        <SkillApproversTab approvers={approvers} allEmployees={allEmployees} />
      ) : (
        <EvalApproversManager rows={evalRows} allEmployees={allEmployees} />
      )}
    </div>
  )
}

function SkillApproversTab({
  approvers,
  allEmployees,
}: {
  approvers: SkillApprover[]
  allEmployees: Employee[]
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [approverId, setApproverId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function empLabel(e: Employee) {
    const name = e.name?.trim() ?? '—'
    return e.employee_no ? `${name}（${e.employee_no}）` : name
  }

  function handleAdd() {
    if (!employeeId || !approverId) {
      setError('従業員と承認者の両方を選択してください')
      return
    }
    if (employeeId === approverId) {
      setError('同一人物は設定できません')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addSkillApprover({ employeeId, approverId })
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      setEmployeeId('')
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeSkillApprover(id)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">上長（承認者）</label>
            <select
              value={approverId}
              onChange={e => { setApproverId(e.target.value); setError(null) }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              <option value="__all__">すべて</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">対象従業員</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            追加
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {!approverId ? (
          <p className="py-10 text-center text-sm text-gray-400">
            上長（承認者）を選択するとリストが表示されます
          </p>
        ) : (
          (() => {
            const filtered = (
              approverId === '__all__'
                ? approvers
                : approvers.filter(a => a.approver_id === approverId)
            )
              .slice()
              .sort((a, b) => {
                const na = a.employee?.employee_no ?? ''
                const nb = b.employee?.employee_no ?? ''
                return na.localeCompare(nb, 'ja', { numeric: true })
              })
            return filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                この承認者に対象従業員が設定されていません
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="w-12 border-b border-gray-200 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">No</th>
                    <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">上長（承認者）</th>
                    <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">対象従業員</th>
                    <th className="border-b border-gray-200 px-4 py-2.5 text-center text-xs font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="w-12 px-2 py-2.5 text-center font-mono text-xs text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {a.approver?.name ?? '—'}
                        {a.approver?.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{a.approver.employee_no}）</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {a.employee?.name ?? '—'}
                        {a.employee?.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{a.employee.employee_no}）</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemove(a.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          })()
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -30
```

期待結果: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/skill-portal/components/ApproversManager.tsx
git commit -m "feat: ApproversManager にタブ UI を追加（スキル承認 / 評価者設定）"
```

---

### Task 6: `page.tsx` を更新して evalRows と activeTab を渡す

**Files:**
- Modify: `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/approvers/page.tsx`

- [ ] **Step 1: page.tsx 全体を以下に置き換える**

```tsx
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getSkillApprovers, getEvalApprovers } from '@/features/skill-portal/queries'
import { ApproversManager } from '@/features/skill-portal/components/ApproversManager'

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export default async function SkillApproversPage({ searchParams }: Props) {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const { tab } = await searchParams
  const activeTab = tab === 'eval' ? 'eval' : 'skill'

  const supabase = await createClient()

  const [approvers, evalRows, employeesRes] = await Promise.all([
    getSkillApprovers(supabase),
    getEvalApprovers(supabase),
    (supabase as any)
      .from('employees')
      .select('id, name, employee_no')
      .eq('active_status', 'active')
      .order('employee_no', { ascending: true }),
  ])

  const allEmployees = (employeesRes.data ?? []) as Array<{
    id: string
    name: string | null
    employee_no: string | null
  }>

  return (
    <div className="min-h-full">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
            <h1 className="text-[1.35rem] font-bold text-gray-900 sm:text-[1.65rem]">
              承認者マスタ管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              スキル申請の上長承認者および人事評価の評価者を従業員ごとに設定します
            </p>
          </div>
          <div className="p-6">
            <ApproversManager
              approvers={approvers}
              allEmployees={allEmployees}
              evalRows={evalRows}
              activeTab={activeTab}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -30
```

期待結果: エラーなし

- [ ] **Step 3: ビルドを実行してエラーがないことを確認する**

```bash
npm run build 2>&1 | tail -20
```

期待結果: `✓ Compiled successfully` または Route 一覧が表示される。エラーなし。

- [ ] **Step 4: コミットする**

```bash
git add src/app/\(tenant\)/\(colored\)/adm/\(skill_map\)/skill-map/approvers/page.tsx
git commit -m "feat: 評価者設定タブを承認者マスタ管理画面に追加"
```

---

## 手動確認手順

1. `npm run dev` で開発サーバーを起動
2. テナント管理者でログインし `/adm/skill-map/approvers` を開く
3. 「スキル承認者」「評価者設定」の2タブが表示されること
4. タブ切り替えで URL が `?tab=eval` に変わること
5. 「評価者設定」タブで従業員・各評価者を選択して「保存」→ 一覧に反映されること
6. 「削除」ボタンで行が消えること
7. 「スキル承認者」タブの既存機能が壊れていないこと

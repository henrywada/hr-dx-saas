# P2-C 1on1支援機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理職と部下の1on1セッションをスケジュール管理・記録・実施率可視化できる機能を `/adm/one-on-one` に実装する。

**Architecture:** `src/features/one-on-one/` を新設し、queries.ts / actions.ts / types.ts + components/ で構成する。DBは新規テーブル2本（セッション記録・テーマテンプレート）を追加するのみで、既存テーブルへの変更は一切なし。ページは Server Component → Client Component のデータフロー（CLAUDE.md パターン準拠）。

**Tech Stack:** Next.js 16 App Router (Server Components), TypeScript 5, Supabase (PostgreSQL + RLS), Tailwind CSS v4, Recharts, Zod v4, date-fns

---

## ファイル構成

### 新規作成ファイル

```
supabase/migrations/
  20260604200000_add_one_on_one_tables.sql       # DBテーブル・RLS・インデックス

src/features/one-on-one/
  types.ts                                        # 全ドメイン型定義
  queries.ts                                      # SELECT のみ
  actions.ts                                      # Server Actions（INSERT/UPDATE）

src/features/one-on-one/components/
  OneOnOneDashboard.tsx                           # メインダッシュボード（Client）
  SessionFormModal.tsx                            # 記録フォームモーダル（Client）
  ImplementationRateChart.tsx                     # 実施率グラフ（Client）
  SessionHistoryTable.tsx                         # セッション履歴テーブル（Client）
  TemplateSelector.tsx                            # テーマテンプレート選択（Client）
  ReminderBadge.tsx                               # 未実施リマインダーバッジ（Client）

src/app/(tenant)/(colored)/adm/(one_on_one)/one-on-one/
  page.tsx                                        # Server Component（データ取得）
  loading.tsx                                     # Suspense フォールバック
  error.tsx                                       # エラーバウンダリ
```

### 変更ファイル

```
src/config/routes.ts                              # ADMIN_ONE_ON_ONE 定数追加
```

---

## Task 1: DB マイグレーション（新規テーブル追加）

**Files:**
- Create: `supabase/migrations/20260604200000_add_one_on_one_tables.sql`

- [ ] **Step 1: マイグレーション SQL を作成する**

```sql
-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

-- 1on1 セッション記録テーブル
CREATE TABLE public.one_on_one_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  manager_id      UUID NOT NULL REFERENCES public.employees(id),   -- 記録者（管理職）
  employee_id     UUID NOT NULL REFERENCES public.employees(id),   -- 部下
  theme           TEXT NOT NULL,                                    -- セッションテーマ
  notes           TEXT,                                             -- 記録内容（自由記述）
  next_date       DATE,                                             -- 次回予定日
  conducted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),               -- 実施日時
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_sessions ENABLE ROW LEVEL SECURITY;

-- テナント内の HR・管理職がアクセスできるポリシー
CREATE POLICY "tenant_isolation" ON public.one_on_one_sessions
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_one_on_one_tenant_manager
  ON public.one_on_one_sessions(tenant_id, manager_id, conducted_at DESC);

CREATE INDEX idx_one_on_one_tenant_employee
  ON public.one_on_one_sessions(tenant_id, employee_id, conducted_at DESC);

-- 1on1 テーマテンプレートテーブル（テナント別カスタマイズ可能）
CREATE TABLE public.one_on_one_theme_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  name        TEXT NOT NULL,    -- テーマ名（例: 目標進捗, 悩み相談）
  description TEXT,             -- テーマの説明
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_theme_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.one_on_one_theme_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_theme_templates_tenant
  ON public.one_on_one_theme_templates(tenant_id, sort_order);
```

- [ ] **Step 2: マイグレーションを適用する**

```bash
supabase migration up
```

期待出力: `Applying migration 20260604200000_add_one_on_one_tables.sql...` に続いて成功メッセージ

- [ ] **Step 3: Supabase 型定義を再生成する**

```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

期待出力: `src/lib/supabase/types.ts` が更新され、`one_on_one_sessions`・`one_on_one_theme_templates` が含まれる

- [ ] **Step 4: コミットする**

```bash
git add supabase/migrations/20260604200000_add_one_on_one_tables.sql src/lib/supabase/types.ts
git commit -m "feat: add one_on_one_sessions and one_on_one_theme_templates tables (P2-C)"
```

---

## Task 2: ルート定数追加

**Files:**
- Modify: `src/config/routes.ts:89`

- [ ] **Step 1: `ADMIN_ONE_ON_ONE` 定数を追加する**

`src/config/routes.ts` の `ADMIN_ENGAGEMENT` 行（89行目付近）の直後に以下を追加する：

```typescript
    /** 1on1支援機能（P2-C） */
    ADMIN_ONE_ON_ONE: '/adm/one-on-one',
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -5
```

期待出力: エラーなし（または既存エラーのみ）

- [ ] **Step 3: コミットする**

```bash
git add src/config/routes.ts
git commit -m "feat: add ADMIN_ONE_ON_ONE route constant (P2-C)"
```

---

## Task 3: 型定義（types.ts）

**Files:**
- Create: `src/features/one-on-one/types.ts`

- [ ] **Step 1: 型定義ファイルを作成する**

```typescript
/** 1on1テーマ定数（組み込みデフォルト） */
export const DEFAULT_THEMES = [
  '目標進捗確認',
  '悩み・困りごと相談',
  'キャリア・成長について',
  'ポジティブフィードバック',
  'フリートーク',
] as const

export type DefaultTheme = (typeof DEFAULT_THEMES)[number]

/** 1on1セッション記録 */
export interface OneOnOneSession {
  id: string
  tenant_id: string
  manager_id: string
  employee_id: string
  theme: string
  notes: string | null
  next_date: string | null  // 'YYYY-MM-DD'
  conducted_at: string       // ISO 8601
  created_at: string
}

/** テーマテンプレート */
export interface ThemeTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** 一覧表示用（従業員名・部署名付き） */
export interface SessionRow {
  id: string
  manager_id: string
  manager_name: string
  employee_id: string
  employee_name: string
  department_name: string | null
  theme: string
  notes: string | null
  next_date: string | null
  conducted_at: string
  /** 前回実施からの経過日数（null = 初回） */
  days_since_last: number | null
}

/** 部署別・管理職別の実施率サマリー */
export interface ImplementationRateRow {
  manager_id: string
  manager_name: string
  department_name: string | null
  total_subordinates: number
  sessions_last_30days: number
  /** 実施率 0〜100 */
  rate: number
}

/** ダッシュボード全体データ */
export interface OneOnOneDashboardData {
  sessions: SessionRow[]
  implementationRates: ImplementationRateRow[]
  themeTemplates: ThemeTemplate[]
  /** 未実施リマインダー対象（30日以上未実施の部下一覧） */
  overdueEmployees: OverdueEmployee[]
  totalSessionsLast30Days: number
  averageRate: number
}

/** 未実施リマインダー対象 */
export interface OverdueEmployee {
  employee_id: string
  employee_name: string
  department_name: string | null
  manager_name: string
  last_session_at: string | null
  /** -1 = 一度も実施なし */
  days_overdue: number
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -5
```

期待出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/one-on-one/types.ts
git commit -m "feat: add one-on-one types (P2-C)"
```

---

## Task 4: クエリ定義（queries.ts）

**Files:**
- Create: `src/features/one-on-one/queries.ts`

- [ ] **Step 1: クエリファイルを作成する**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { differenceInDays } from 'date-fns'
import type {
  SessionRow,
  ImplementationRateRow,
  ThemeTemplate,
  OverdueEmployee,
  OneOnOneDashboardData,
} from './types'

/** 直近50件のセッション一覧（従業員・部署名付き）を取得する */
export async function getOneOnOneSessions(): Promise<SessionRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('one_on_one_sessions')
    .select(`
      id,
      manager_id,
      employee_id,
      theme,
      notes,
      next_date,
      conducted_at
    `)
    .eq('tenant_id', user.tenant_id)
    .order('conducted_at', { ascending: false })
    .limit(200)

  if (error || !data) return []

  const allEmployeeIds = [...new Set([...data.map(s => s.manager_id), ...data.map(s => s.employee_id)])]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', allEmployeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData)
        ? (divData[0]?.name ?? null)
        : (divData?.name ?? null)
      return [e.id, { name: e.name ?? '', deptName }]
    })
  )

  return data.slice(0, 50).map(s => {
    const manager = empMap.get(s.manager_id)
    const employee = empMap.get(s.employee_id)

    const sortedForEmp = data
      .filter(d => d.employee_id === s.employee_id)
      .sort((a, b) => b.conducted_at.localeCompare(a.conducted_at))
    const idx = sortedForEmp.findIndex(d => d.id === s.id)
    const prevSession = sortedForEmp[idx + 1]
    const daysSince = prevSession
      ? differenceInDays(new Date(s.conducted_at), new Date(prevSession.conducted_at))
      : null

    return {
      id: s.id,
      manager_id: s.manager_id,
      manager_name: manager?.name ?? '',
      employee_id: s.employee_id,
      employee_name: employee?.name ?? '',
      department_name: employee?.deptName ?? null,
      theme: s.theme,
      notes: s.notes,
      next_date: s.next_date,
      conducted_at: s.conducted_at,
      days_since_last: daysSince,
    }
  })
}

/** 管理職別の実施率サマリーを取得する（直近30日） */
export async function getImplementationRates(): Promise<ImplementationRateRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await supabase
    .from('one_on_one_sessions')
    .select('manager_id, employee_id')
    .eq('tenant_id', user.tenant_id)
    .gte('conducted_at', thirtyDaysAgo)

  const { data: managers } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('is_manager', true)
    .eq('active_status', 'active')

  if (!managers) return []

  const { data: subordinates } = await supabase
    .from('employees')
    .select('id, division_id')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)

  const subordinatesByDivision = new Map<string, string[]>()
  for (const sub of subordinates ?? []) {
    if (!sub.division_id) continue
    const arr = subordinatesByDivision.get(sub.division_id) ?? []
    arr.push(sub.id)
    subordinatesByDivision.set(sub.division_id, arr)
  }

  const sessionsByManager = new Map<string, Set<string>>()
  for (const s of sessions ?? []) {
    const set = sessionsByManager.get(s.manager_id) ?? new Set()
    set.add(s.employee_id)
    sessionsByManager.set(s.manager_id, set)
  }

  return managers.map(m => {
    const divData = m.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData)
      ? (divData[0]?.name ?? null)
      : (divData?.name ?? null)

    const subs = m.division_id ? (subordinatesByDivision.get(m.division_id) ?? []) : []
    const conducted = sessionsByManager.get(m.id) ?? new Set()
    const totalSubs = subs.length
    const sessionsCount = conducted.size
    const rate = totalSubs > 0 ? Math.round((sessionsCount / totalSubs) * 100) : 0

    return {
      manager_id: m.id,
      manager_name: m.name ?? '',
      department_name: deptName,
      total_subordinates: totalSubs,
      sessions_last_30days: sessionsCount,
      rate,
    }
  }).sort((a, b) => b.rate - a.rate)
}

/** テーマテンプレート一覧を取得する */
export async function getThemeTemplates(): Promise<ThemeTemplate[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('one_on_one_theme_templates')
    .select('id, tenant_id, name, description, sort_order, is_active, created_at')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order')

  if (error || !data) return []
  return data as ThemeTemplate[]
}

/** 30日以上未実施の部下一覧（リマインダー対象）を取得する */
export async function getOverdueEmployees(): Promise<OverdueEmployee[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)

  if (!employees || employees.length === 0) return []

  const employeeIds = employees.map(e => e.id)

  const { data: sessions } = await supabase
    .from('one_on_one_sessions')
    .select('employee_id, manager_id, conducted_at')
    .eq('tenant_id', user.tenant_id)
    .in('employee_id', employeeIds)
    .order('conducted_at', { ascending: false })
    .limit(employeeIds.length * 3)

  const latestByEmployee = new Map<string, { manager_id: string; conducted_at: string }>()
  for (const s of sessions ?? []) {
    if (!latestByEmployee.has(s.employee_id)) {
      latestByEmployee.set(s.employee_id, { manager_id: s.manager_id, conducted_at: s.conducted_at })
    }
  }

  const managerIds = [...new Set([...latestByEmployee.values()].map(v => v.manager_id))]
  const { data: managers } = managerIds.length > 0
    ? await supabase.from('employees').select('id, name').in('id', managerIds)
    : { data: [] }
  const managerMap = new Map((managers ?? []).map(m => [m.id, m.name ?? '']))

  const now = new Date()
  const overdue: OverdueEmployee[] = []

  for (const emp of employees) {
    const last = latestByEmployee.get(emp.id)
    const lastDate = last ? new Date(last.conducted_at) : null
    const daysOverdue = lastDate ? differenceInDays(now, lastDate) : 999

    if (daysOverdue >= 30) {
      const divData = emp.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData)
        ? (divData[0]?.name ?? null)
        : (divData?.name ?? null)

      overdue.push({
        employee_id: emp.id,
        employee_name: emp.name ?? '',
        department_name: deptName,
        manager_name: last ? (managerMap.get(last.manager_id) ?? '未割当') : '未割当',
        last_session_at: last?.conducted_at ?? null,
        days_overdue: daysOverdue === 999 ? -1 : daysOverdue,
      })
    }
  }

  return overdue.sort((a, b) => b.days_overdue - a.days_overdue)
}

/** ダッシュボード用データをまとめて取得する */
export async function getOneOnOneDashboardData(): Promise<OneOnOneDashboardData> {
  const [sessions, implementationRates, themeTemplates, overdueEmployees] = await Promise.all([
    getOneOnOneSessions(),
    getImplementationRates(),
    getThemeTemplates(),
    getOverdueEmployees(),
  ])

  const totalSessionsLast30Days = implementationRates.reduce(
    (sum, r) => sum + r.sessions_last_30days, 0
  )
  const averageRate = implementationRates.length > 0
    ? Math.round(implementationRates.reduce((sum, r) => sum + r.rate, 0) / implementationRates.length)
    : 0

  return {
    sessions,
    implementationRates,
    themeTemplates,
    overdueEmployees,
    totalSessionsLast30Days,
    averageRate,
  }
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -10
```

期待出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/one-on-one/queries.ts
git commit -m "feat: add one-on-one queries (P2-C)"
```

---

## Task 5: Server Actions（actions.ts）

**Files:**
- Create: `src/features/one-on-one/actions.ts`

- [ ] **Step 1: actions.ts を作成する**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer', 'manager']

const sessionSchema = z.object({
  employeeId: z.string().uuid(),
  theme: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  nextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  conductedAt: z.string().datetime().optional(),
})

/** 1on1セッションを記録する */
export async function recordOneOnOneSession(input: {
  employeeId: string
  theme: string
  notes?: string
  nextDate?: string
  conductedAt?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = sessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('one_on_one_sessions').insert({
    tenant_id: user.tenant_id,
    manager_id: user.employee_id,
    employee_id: parsed.data.employeeId,
    theme: parsed.data.theme,
    notes: parsed.data.notes ?? null,
    next_date: parsed.data.nextDate ?? null,
    conducted_at: parsed.data.conductedAt ?? new Date().toISOString(),
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999),
})

/** テーマテンプレートを追加する */
export async function addThemeTemplate(input: {
  name: string
  description?: string
  sortOrder?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = templateSchema.safeParse({
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder ?? 0,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('one_on_one_theme_templates').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sortOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

/** デフォルトテーマテンプレートをシードする（テナント初回セットアップ用・冪等） */
export async function seedDefaultThemeTemplates(): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const supabase = await createClient()

  // 既存テンプレートが1件以上あればスキップ（冪等性を保証）
  const { data: existing } = await supabase
    .from('one_on_one_theme_templates')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true }
  }

  const defaults = [
    { name: '目標進捗確認', description: 'OKR・KPI の進捗を確認する', sort_order: 0 },
    { name: '悩み・困りごと相談', description: '業務や人間関係の困りごとをヒアリングする', sort_order: 1 },
    { name: 'キャリア・成長について', description: 'キャリアパスや成長目標を話し合う', sort_order: 2 },
    { name: 'ポジティブフィードバック', description: '良かった行動・成果を具体的に伝える', sort_order: 3 },
    { name: 'フリートーク', description: '特定テーマなし・リラックスした対話', sort_order: 4 },
  ]

  const { error } = await supabase.from('one_on_one_theme_templates').insert(
    defaults.map(d => ({ ...d, tenant_id: user.tenant_id! }))
  )

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -10
```

期待出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/features/one-on-one/actions.ts
git commit -m "feat: add one-on-one server actions (P2-C)"
```

---

## Task 6: ReminderBadge コンポーネント

**Files:**
- Create: `src/features/one-on-one/components/ReminderBadge.tsx`

- [ ] **Step 1: ReminderBadge を作成する**

```tsx
'use client'

import type { OverdueEmployee } from '../types'

interface Props {
  overdueEmployees: OverdueEmployee[]
}

export function ReminderBadge({ overdueEmployees }: Props) {
  if (overdueEmployees.length === 0) return null

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {overdueEmployees.length}
        </span>
        <h3 className="text-sm font-semibold text-orange-800">
          30日以上 1on1 未実施の部下
        </h3>
      </div>
      <ul className="space-y-1.5">
        {overdueEmployees.slice(0, 5).map(emp => (
          <li key={emp.employee_id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              {emp.employee_name}
              {emp.department_name && (
                <span className="ml-1.5 text-gray-400">({emp.department_name})</span>
              )}
            </span>
            <span className="text-orange-600 font-medium">
              {emp.days_overdue === -1
                ? '未実施'
                : `${emp.days_overdue}日経過`
              }
            </span>
          </li>
        ))}
        {overdueEmployees.length > 5 && (
          <li className="text-xs text-gray-400">
            他 {overdueEmployees.length - 5} 名
          </li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/one-on-one/components/ReminderBadge.tsx
git commit -m "feat: add ReminderBadge component (P2-C)"
```

---

## Task 7: TemplateSelector コンポーネント

**Files:**
- Create: `src/features/one-on-one/components/TemplateSelector.tsx`

- [ ] **Step 1: TemplateSelector を作成する**

```tsx
'use client'

import { DEFAULT_THEMES } from '../types'
import type { ThemeTemplate } from '../types'

interface Props {
  templates: ThemeTemplate[]
  value: string
  onChange: (theme: string) => void
}

export function TemplateSelector({ templates, value, onChange }: Props) {
  const displayThemes = templates.length > 0
    ? templates.map(t => t.name)
    : [...DEFAULT_THEMES]

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        テーマ <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {displayThemes.map(theme => (
          <button
            key={theme}
            type="button"
            onClick={() => onChange(theme)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              value === theme
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {theme}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="または自由入力..."
        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/one-on-one/components/TemplateSelector.tsx
git commit -m "feat: add TemplateSelector component (P2-C)"
```

---

## Task 8: SessionFormModal コンポーネント

**Files:**
- Create: `src/features/one-on-one/components/SessionFormModal.tsx`

- [ ] **Step 1: SessionFormModal を作成する**

```tsx
'use client'

import { useState } from 'react'
import { recordOneOnOneSession } from '../actions'
import { TemplateSelector } from './TemplateSelector'
import type { ThemeTemplate } from '../types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  employees: Employee[]
  templates: ThemeTemplate[]
}

export function SessionFormModal({ open, onClose, employees, templates }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [theme, setTheme] = useState('')
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [conductedAt, setConductedAt] = useState(
    new Date().toISOString().slice(0, 16)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !theme) {
      setError('部下とテーマは必須です')
      return
    }
    setLoading(true)
    setError(null)

    const result = await recordOneOnOneSession({
      employeeId,
      theme,
      notes: notes || undefined,
      nextDate: nextDate || undefined,
      conductedAt: new Date(conductedAt).toISOString(),
    })

    setLoading(false)
    if (result.success) {
      setEmployeeId('')
      setTheme('')
      setNotes('')
      setNextDate('')
      onClose()
    } else {
      setError(result.error ?? '記録に失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">1on1 セッション記録</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部下 <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
            >
              <option value="">選択してください</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.department_name ? ` (${emp.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <TemplateSelector
            templates={templates}
            value={theme}
            onChange={setTheme}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              実施日時
            </label>
            <input
              type="datetime-local"
              value={conductedAt}
              onChange={e => setConductedAt(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              記録内容（任意）
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="話した内容・気づき・アクションアイテムなど"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              次回予定日（任意）
            </label>
            <input
              type="date"
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -10
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/one-on-one/components/SessionFormModal.tsx
git commit -m "feat: add SessionFormModal component (P2-C)"
```

---

## Task 9: ImplementationRateChart コンポーネント

**Files:**
- Create: `src/features/one-on-one/components/ImplementationRateChart.tsx`

- [ ] **Step 1: ImplementationRateChart を作成する**

```tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { ImplementationRateRow } from '../types'

interface Props {
  data: ImplementationRateRow[]
}

function getRateColor(rate: number): string {
  if (rate >= 80) return '#22c55e'
  if (rate >= 50) return '#f59e0b'
  return '#ef4444'
}

export function ImplementationRateChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データなし — 管理職（is_manager = true）の従業員登録が必要です
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: d.manager_name.length > 8 ? d.manager_name.slice(0, 7) + '…' : d.manager_name,
    fullName: d.manager_name,
    rate: d.rate,
    dept: d.department_name ?? '',
    sessions: d.sessions_last_30days,
    total: d.total_subordinates,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip
          formatter={(value, _, props) => [
            `${value}%（${props.payload.sessions}/${props.payload.total}名）`,
            '実施率（直近30日）',
          ]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getRateColor(entry.rate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/one-on-one/components/ImplementationRateChart.tsx
git commit -m "feat: add ImplementationRateChart component (P2-C)"
```

---

## Task 10: SessionHistoryTable コンポーネント

**Files:**
- Create: `src/features/one-on-one/components/SessionHistoryTable.tsx`

- [ ] **Step 1: SessionHistoryTable を作成する**

```tsx
'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { SessionRow } from '../types'

interface Props {
  sessions: SessionRow[]
}

export function SessionHistoryTable({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        記録がありません — 「記録する」ボタンから初回の1on1を登録してください
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">実施日</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">部下</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">管理職</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">テーマ</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">前回からの経過</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">次回予定</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sessions.map(s => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {format(new Date(s.conducted_at), 'M/d (E)', { locale: ja })}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">{s.employee_name}</span>
                {s.department_name && (
                  <span className="ml-1.5 text-xs text-gray-400">{s.department_name}</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">{s.manager_name}</td>
              <td className="px-4 py-3">
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {s.theme}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {s.days_since_last === null
                  ? <span className="text-xs text-gray-300">初回</span>
                  : <span className={s.days_since_last >= 30 ? 'text-orange-500 font-medium' : ''}>
                      {s.days_since_last}日
                    </span>
                }
              </td>
              <td className="px-4 py-3 text-gray-500">
                {s.next_date
                  ? format(new Date(s.next_date), 'M/d', { locale: ja })
                  : <span className="text-xs text-gray-300">—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/one-on-one/components/SessionHistoryTable.tsx
git commit -m "feat: add SessionHistoryTable component (P2-C)"
```

---

## Task 11: OneOnOneDashboard メインコンポーネント

**Files:**
- Create: `src/features/one-on-one/components/OneOnOneDashboard.tsx`

- [ ] **Step 1: OneOnOneDashboard を作成する**

```tsx
'use client'

import { useState } from 'react'
import { SessionFormModal } from './SessionFormModal'
import { ImplementationRateChart } from './ImplementationRateChart'
import { SessionHistoryTable } from './SessionHistoryTable'
import { ReminderBadge } from './ReminderBadge'
import type { OneOnOneDashboardData } from '../types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  data: OneOnOneDashboardData
  employees: Employee[]
}

export function OneOnOneDashboard({ data, employees }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/one-on-one — 1on1支援機能
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              1on1 支援ダッシュボード
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              実施率の可視化・テーマ標準化・未実施リマインダー
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + 記録する
          </button>
        </div>

        {/* カード本文 */}
        <div className="space-y-8 p-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                直近30日 実施件数
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {data.totalSessionsLast30Days}
                <span className="ml-1 text-sm font-normal text-gray-400">件</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                平均実施率
              </p>
              <p className={`mt-2 text-3xl font-bold ${
                data.averageRate >= 80 ? 'text-green-600'
                  : data.averageRate >= 50 ? 'text-amber-600'
                  : 'text-red-600'
              }`}>
                {data.averageRate}
                <span className="ml-1 text-sm font-normal text-gray-400">%</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                未実施リマインダー
              </p>
              <p className={`mt-2 text-3xl font-bold ${
                data.overdueEmployees.length > 0 ? 'text-orange-500' : 'text-gray-900'
              }`}>
                {data.overdueEmployees.length}
                <span className="ml-1 text-sm font-normal text-gray-400">名</span>
              </p>
            </div>
          </div>

          {/* 未実施リマインダー */}
          {data.overdueEmployees.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-gray-700">
                未実施リマインダー（30日以上）
              </h2>
              <ReminderBadge overdueEmployees={data.overdueEmployees} />
            </section>
          )}

          {/* 管理職別実施率グラフ */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              管理職別 実施率ランキング（直近30日）
            </h2>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <ImplementationRateChart data={data.implementationRates} />
            </div>
          </section>

          {/* セッション履歴テーブル */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              直近 セッション記録（最新50件）
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <SessionHistoryTable sessions={data.sessions} />
            </div>
          </section>
        </div>
      </div>

      {/* 記録モーダル */}
      <SessionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employees={employees}
        templates={data.themeTemplates}
      />
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -10
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/one-on-one/components/OneOnOneDashboard.tsx
git commit -m "feat: add OneOnOneDashboard main component (P2-C)"
```

---

## Task 12: ページファイル（page.tsx / loading.tsx / error.tsx）

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(one_on_one)/one-on-one/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(one_on_one)/one-on-one/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(one_on_one)/one-on-one/error.tsx`

- [ ] **Step 1: page.tsx を作成する**

```tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getOneOnOneDashboardData } from '@/features/one-on-one/queries'
import { seedDefaultThemeTemplates } from '@/features/one-on-one/actions'
import { OneOnOneDashboard } from '@/features/one-on-one/components/OneOnOneDashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '1on1支援機能' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function OneOnOnePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  // テーマテンプレートが空の場合にデフォルトをシード（冪等）
  await seedDefaultThemeTemplates()

  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)
    .order('name')

  const employeeList = (employees ?? []).map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData)
      ? (divData[0]?.name ?? null)
      : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })

  const data = await getOneOnOneDashboardData()

  return <OneOnOneDashboard data={data} employees={employeeList} />
}
```

- [ ] **Step 2: loading.tsx を作成する**

```tsx
export default function OneOnOneLoading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
        <div className="border-b border-gray-200 bg-gray-100 h-10" />
        <div className="border-b border-gray-200 bg-gray-200 h-20" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100" />
          <div className="h-48 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: error.tsx を作成する**

```tsx
'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function OneOnOneError({ error, reset }: Props) {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-200 bg-red-50 px-6 py-4">
          <h2 className="text-base font-semibold text-red-700">
            1on1支援機能の読み込みに失敗しました
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{error.message}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 型チェックを実行する**

```bash
npm run type-check 2>&1 | tail -15
```

期待出力: エラーなし

- [ ] **Step 5: コミットする**

```bash
git add src/app/(tenant)/(colored)/adm/(one_on_one)/one-on-one/
git commit -m "feat: add page, loading, error for /adm/one-on-one (P2-C)"
```

---

## Task 13: 動作確認

- [ ] **Step 1: 開発サーバーを起動する**

```bash
npm run dev
```

- [ ] **Step 2: `/adm/one-on-one` にアクセスして動作確認する**

確認項目:
- ページが 500 エラーなく表示される
- サマリーカード3個（直近30日実施件数・平均実施率・未実施リマインダー）が表示される
- 「+ 記録する」ボタンをクリックするとモーダルが開く
- テーマテンプレートのタグが5個表示される（初回シード済み）
- 部下を選択しテーマを選んで「記録する」を押すと記録され、モーダルが閉じる
- 履歴テーブルに新しいセッションが表示される

- [ ] **Step 3: `npm run build` でビルドエラーがないことを確認する**

```bash
npm run build 2>&1 | tail -20
```

期待出力: `✓ Compiled successfully` または `/adm/one-on-one` ルートがページ一覧に含まれる

- [ ] **Step 4: 最終コミット**

```bash
git add .
git commit -m "feat: complete P2-C one-on-one support feature"
```

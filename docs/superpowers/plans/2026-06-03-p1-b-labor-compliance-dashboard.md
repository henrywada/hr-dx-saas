# P1-B 労務コンプライアンスダッシュボード 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 残業アラート・有休取得義務進捗・36協定特別条項・部署別ヒートマップを1画面に統合した労務コンプライアンスダッシュボードを `/adm/labor-compliance` に実装する

**Architecture:** `src/features/labor-compliance/` 新規ドメインを作成し、既存の `overtime_alerts`・`overtime_monthly_stats`・`overtime_settings`・`work_time_records` テーブルを参照するクエリを集約する。新テーブルは不要。`page.tsx` (Server Component) でデータ取得し、Client Component に Props として渡す。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS v4, date-fns

---

## 絶対禁止事項（実装者必読）

- `supabase db reset` の実行禁止（既存データが消滅する）
- マイグレーションは `supabase migration new` → `supabase migration up` のみ
- 既存テーブルへの破壊的変更（DROP / ALTER で既存カラム削除）禁止
- `createAdminClient()` をエンドユーザー向け actions.ts で使用禁止

---

## 既存テーブル構造（参照のみ、変更なし）

| テーブル名 | 用途 |
|---|---|
| `overtime_alerts` | `alert_type`, `alert_value`, `triggered_at`, `resolved_at` — 残業アラート |
| `overtime_monthly_stats` | `overtime_minutes`, `period_month` — 月別残業集計 |
| `overtime_settings` | `monthly_limit_hours`, `annual_limit_hours` — 閾値設定 |
| `work_time_records` | `is_holiday`, `duration_minutes` — 勤怠記録 |
| `overtime_applications` | `requested_hours`, `status` — 残業申請 |
| `employees` | `name`, `division_id`, `employee_no` |
| `divisions` | `id`, `name` |

既存 alert_type 値（`overtime_alerts.alert_type`）:
- `monthly_ot_45_exceeded` / `monthly_45_exceeded` → 月45h超
- `monthly_ot_100_exceeded` / `monthly_100_exceeded` → 月100h超
- `annual_ot_360_exceeded` / `yearly_360_exceeded` → 年360h超
- `rolling_6m_avg_80_exceeded` / `rolling_6m_80_exceeded` → 6ヶ月平均80h超

---

## ファイル構成

### 新規作成ファイル

```
src/features/labor-compliance/
├── types.ts                       # 型定義
└── queries.ts                     # SELECT 専用クエリ（Server Component から直接呼ぶ）

src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/
├── page.tsx                       # Server Component（データ取得 + 権限チェック）
├── loading.tsx                    # Suspense フォールバック
├── error.tsx                      # エラーバウンダリ
└── components/
    ├── LaborComplianceDashboard.tsx   # メインClient Component（状態管理・タブ）
    ├── OvertimeAlertPanel.tsx          # 残業アラート一覧パネル
    ├── PaidLeavePanel.tsx              # 有休取得義務進捗パネル
    ├── Article36Panel.tsx              # 36協定特別条項対象者パネル
    └── DivisionHeatmap.tsx             # 部署別ヒートマップ
```

### 変更ファイル

```
src/config/routes.ts               # ADMIN_LABOR_COMPLIANCE 定数追加
```

---

## Task 1: ルーティング定数の追加

**Files:**
- Modify: `src/config/routes.ts:81`

- [ ] **Step 1: routes.ts にルート定数を追加**

`src/config/routes.ts` の `ADMIN_RECRUIT_FUNNEL` の直後に以下を追加：

```typescript
    /** 労務コンプライアンスダッシュボード（P1-B） */
    ADMIN_LABOR_COMPLIANCE: '/adm/labor-compliance',
```

- [ ] **Step 2: 型チェック実行**

```bash
npm run type-check
```

期待結果: エラーなし（定数追加のみなので型エラーは発生しない）

- [ ] **Step 3: コミット**

```bash
git add src/config/routes.ts
git commit -m "feat: add ADMIN_LABOR_COMPLIANCE route constant"
```

---

## Task 2: 型定義ファイルの作成

**Files:**
- Create: `src/features/labor-compliance/types.ts`

- [ ] **Step 1: types.ts を作成**

```typescript
/** 月残業時間の法令閾値（分） */
export const MONTHLY_45H_MINUTES = 45 * 60
export const MONTHLY_80H_MINUTES = 80 * 60
export const MONTHLY_100H_MINUTES = 100 * 60
export const ANNUAL_360H_MINUTES = 360 * 60

/** 残業アラートの重要度ランク */
export const ALERT_SEVERITY: Record<string, number> = {
  annual_ot_360_exceeded: 100,
  yearly_360_exceeded: 100,
  monthly_ot_100_exceeded: 90,
  monthly_100_exceeded: 90,
  rolling_6m_avg_80_exceeded: 80,
  rolling_6m_80_exceeded: 80,
  monthly_ot_45_exceeded: 50,
  monthly_45_exceeded: 50,
}

export type AlertSeverityLevel = 'critical' | 'warning' | 'caution'

export function getAlertSeverityLevel(alertType: string): AlertSeverityLevel {
  const score = ALERT_SEVERITY[alertType] ?? 0
  if (score >= 90) return 'critical'
  if (score >= 70) return 'warning'
  return 'caution'
}

/** 残業アラート表示用行 */
export type OvertimeAlertDisplayRow = {
  id: string
  employeeId: string
  employeeName: string
  employeeNo: string | null
  divisionName: string
  alertType: string
  alertTypeLabel: string
  severityLevel: AlertSeverityLevel
  triggeredAt: string | null
  resolvedAt: string | null
  alertValue: Record<string, unknown> | null
}

/** 有休取得進捗行 */
export type PaidLeaveProgressRow = {
  employeeId: string
  employeeName: string
  employeeNo: string | null
  divisionName: string
  /** 年度開始以降の is_holiday=true のカウント（有休取得日数の近似値） */
  takenDays: number
  /** 法定義務：年5日 */
  requiredDays: 5
  /** 義務未達のリスクあり（5日未満） */
  atRisk: boolean
}

/** 36協定特別条項対象者行 */
export type Article36SubjectRow = {
  employeeId: string
  employeeName: string
  employeeNo: string | null
  divisionName: string
  /** 直近12ヶ月の月100h超アラート件数 */
  monthOver100Count: number
  /** 直近12ヶ月の月45h超アラート件数 */
  monthOver45Count: number
  /** 年360h超アラートあり */
  hasAnnualExceeded: boolean
}

/** 部署別ヒートマップ行 */
export type DivisionHeatmapRow = {
  divisionId: string
  divisionName: string
  employeeCount: number
  /** 部署平均残業時間（分）— overtime_monthly_stats の指定月 */
  avgOvertimeMinutes: number
  /** 法令リスク従業員数（未解決アラートあり） */
  legalRiskCount: number
  /** 有休取得率（takenDays>=5の人 / 全員） */
  paidLeaveComplianceRate: number
}

/** ダッシュボード全体データバンドル */
export type LaborComplianceBundle = {
  /** 選択月（YYYY-MM） */
  yearMonth: string
  /** 残業アラート一覧（未解決、重大度降順） */
  overtimeAlerts: OvertimeAlertDisplayRow[]
  /** 有休取得義務進捗（リスクあり先頭） */
  paidLeaveProgress: PaidLeaveProgressRow[]
  /** 36協定特別条項対象者（月100h超1件以上 or 年360h超） */
  article36Subjects: Article36SubjectRow[]
  /** 部署別ヒートマップ */
  divisionHeatmap: DivisionHeatmapRow[]
  /** サマリー数値 */
  summary: {
    unresolvedAlertCount: number
    paidLeaveAtRiskCount: number
    article36SubjectCount: number
    totalEmployees: number
  }
}

/** alert_type の日本語ラベル */
export const ALERT_TYPE_LABELS: Record<string, string> = {
  annual_ot_360_exceeded: '年360時間超',
  yearly_360_exceeded: '年360時間超',
  monthly_ot_100_exceeded: '月100時間超（特別条項上限）',
  monthly_100_exceeded: '月100時間超（特別条項上限）',
  rolling_6m_avg_80_exceeded: '6ヶ月平均80時間超',
  rolling_6m_80_exceeded: '6ヶ月平均80時間超',
  monthly_ot_45_exceeded: '月45時間超（限度基準）',
  monthly_45_exceeded: '月45時間超（限度基準）',
  monthly_overtime_warning: '月残業警告',
}
```

- [ ] **Step 2: 型チェック実行**

```bash
npm run type-check
```

期待結果: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/labor-compliance/types.ts
git commit -m "feat: add labor-compliance types"
```

---

## Task 3: クエリ関数の実装

**Files:**
- Create: `src/features/labor-compliance/queries.ts`

- [ ] **Step 1: queries.ts を作成**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  LaborComplianceBundle,
  OvertimeAlertDisplayRow,
  PaidLeaveProgressRow,
  Article36SubjectRow,
  DivisionHeatmapRow,
} from './types'
import {
  ALERT_SEVERITY,
  ALERT_TYPE_LABELS,
  getAlertSeverityLevel,
} from './types'

function periodMonthDate(yearMonth: string): string {
  return `${yearMonth}-01`
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${yearMonth}-${String(last).padStart(2, '0')}`
}

/** 指定月を終端とする過去12ヶ月の YYYY-MM-01 文字列リスト */
function last12PeriodMonths(yearMonth: string): string[] {
  const [y, m] = yearMonth.split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(y, m - 1 - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    out.push(ym)
  }
  return out
}

/** 現在の年度開始月（4月）の YYYY-MM-DD */
function fiscalYearStart(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const fiscalYear = m >= 4 ? y : y - 1
  return `${fiscalYear}-04-01`
}

export async function getLaborComplianceBundle(
  yearMonth: string,
): Promise<{ ok: true; data: LaborComplianceBundle } | { ok: false; error: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const tenantId = user.tenant_id

  try {
    // ① 従業員 + 部署一覧を取得
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, name, employee_no, division_id, divisions(name)')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
    if (empErr) return { ok: false, error: empErr.message }

    type EmpRow = {
      id: string
      name: string | null
      employee_no: string | null
      division_id: string | null
      divisions: { name: string } | null
    }
    const emps = (employees ?? []) as EmpRow[]
    const empMap = new Map(emps.map((e) => [e.id, e]))

    // ② overtime_alerts（直近12ヶ月分）を取得
    const past12 = last12PeriodMonths(yearMonth)
    const oldestPeriodYm = past12[past12.length - 1].slice(0, 7)

    const { data: alerts, error: alertErr } = await supabase
      .from('overtime_alerts')
      .select('id, employee_id, alert_type, alert_value, triggered_at, resolved_at')
      .eq('tenant_id', tenantId)
      .gte('triggered_at', `${oldestPeriodYm}-01`)
      .order('triggered_at', { ascending: false })
    if (alertErr) return { ok: false, error: alertErr.message }

    const allAlerts = alerts ?? []

    // ③ 未解決アラートを表示行に変換（重大度降順）
    const unresolvedAlerts = allAlerts
      .filter((a) => !a.resolved_at)
      .map((a): OvertimeAlertDisplayRow => {
        const emp = empMap.get(a.employee_id)
        return {
          id: a.id,
          employeeId: a.employee_id,
          employeeName: emp?.name?.trim() || '—',
          employeeNo: emp?.employee_no ?? null,
          divisionName: emp?.divisions?.name ?? '—',
          alertType: a.alert_type,
          alertTypeLabel: ALERT_TYPE_LABELS[a.alert_type] ?? a.alert_type,
          severityLevel: getAlertSeverityLevel(a.alert_type),
          triggeredAt: a.triggered_at,
          resolvedAt: a.resolved_at,
          alertValue: (a.alert_value as Record<string, unknown> | null) ?? null,
        }
      })
      .sort((a, b) => (ALERT_SEVERITY[b.alertType] ?? 0) - (ALERT_SEVERITY[a.alertType] ?? 0))

    // ④ 有休取得進捗：年度開始（4月）〜指定月末の is_holiday=true 日数を社員別に集計
    const fiscalStart = fiscalYearStart(yearMonth)
    const monthEnd = lastDayOfMonth(yearMonth)

    const { data: workRecords, error: wrErr } = await supabase
      .from('work_time_records')
      .select('employee_id, record_date, is_holiday')
      .eq('tenant_id', tenantId)
      .gte('record_date', fiscalStart)
      .lte('record_date', monthEnd)
      .eq('is_holiday', true)
    if (wrErr) return { ok: false, error: wrErr.message }

    const holidayCountByEmp = new Map<string, number>()
    for (const wr of workRecords ?? []) {
      holidayCountByEmp.set(
        wr.employee_id,
        (holidayCountByEmp.get(wr.employee_id) ?? 0) + 1,
      )
    }

    const paidLeaveProgress: PaidLeaveProgressRow[] = emps.map((emp) => {
      const taken = holidayCountByEmp.get(emp.id) ?? 0
      return {
        employeeId: emp.id,
        employeeName: emp.name?.trim() || '—',
        employeeNo: emp.employee_no ?? null,
        divisionName: emp.divisions?.name ?? '—',
        takenDays: taken,
        requiredDays: 5,
        atRisk: taken < 5,
      }
    })
    paidLeaveProgress.sort((a, b) => a.takenDays - b.takenDays)

    // ⑤ 36協定特別条項対象者：直近12ヶ月で月100h超アラートが1件以上 or 年360h超アラートあり
    const alertsByEmp = new Map<string, typeof allAlerts>()
    for (const a of allAlerts) {
      const list = alertsByEmp.get(a.employee_id) ?? []
      list.push(a)
      alertsByEmp.set(a.employee_id, list)
    }

    const article36Subjects: Article36SubjectRow[] = []
    for (const emp of emps) {
      const empAlerts = alertsByEmp.get(emp.id) ?? []
      const month100 = empAlerts.filter((a) =>
        ['monthly_ot_100_exceeded', 'monthly_100_exceeded'].includes(a.alert_type),
      ).length
      const month45 = empAlerts.filter((a) =>
        ['monthly_ot_45_exceeded', 'monthly_45_exceeded'].includes(a.alert_type),
      ).length
      const hasAnnual = empAlerts.some((a) =>
        ['annual_ot_360_exceeded', 'yearly_360_exceeded'].includes(a.alert_type),
      )

      if (month100 > 0 || hasAnnual) {
        article36Subjects.push({
          employeeId: emp.id,
          employeeName: emp.name?.trim() || '—',
          employeeNo: emp.employee_no ?? null,
          divisionName: emp.divisions?.name ?? '—',
          monthOver100Count: month100,
          monthOver45Count: month45,
          hasAnnualExceeded: hasAnnual,
        })
      }
    }
    article36Subjects.sort((a, b) => b.monthOver100Count - a.monthOver100Count)

    // ⑥ 部署別ヒートマップ：指定月の overtime_monthly_stats を集計
    const { data: monthlyStats, error: msErr } = await supabase
      .from('overtime_monthly_stats')
      .select('employee_id, overtime_minutes')
      .eq('tenant_id', tenantId)
      .eq('period_month', periodMonthDate(yearMonth))
    if (msErr) return { ok: false, error: msErr.message }

    const otMinByEmp = new Map<string, number>()
    for (const s of monthlyStats ?? []) {
      otMinByEmp.set(s.employee_id, Number(s.overtime_minutes ?? 0))
    }

    const divMap = new Map<string, { divisionName: string; empIds: string[] }>()
    for (const emp of emps) {
      const divId = emp.division_id ?? '__none__'
      const divName = emp.divisions?.name ?? '未配属'
      const entry = divMap.get(divId) ?? { divisionName: divName, empIds: [] }
      entry.empIds.push(emp.id)
      divMap.set(divId, entry)
    }

    const unresolvedAlertEmpSet = new Set(unresolvedAlerts.map((a) => a.employeeId))
    const paidLeaveAtRiskSet = new Set(
      paidLeaveProgress.filter((r) => r.atRisk).map((r) => r.employeeId),
    )

    const divisionHeatmap: DivisionHeatmapRow[] = Array.from(divMap.entries()).map(
      ([divId, { divisionName, empIds }]) => {
        const count = empIds.length
        const totalOt = empIds.reduce((acc, id) => acc + (otMinByEmp.get(id) ?? 0), 0)
        const avgOt = count > 0 ? Math.round(totalOt / count) : 0
        const legalRisk = empIds.filter((id) => unresolvedAlertEmpSet.has(id)).length
        const paidLeaveCompliant = empIds.filter((id) => !paidLeaveAtRiskSet.has(id)).length
        const plRate = count > 0 ? Math.round((paidLeaveCompliant / count) * 100) : 100
        return {
          divisionId: divId,
          divisionName,
          employeeCount: count,
          avgOvertimeMinutes: avgOt,
          legalRiskCount: legalRisk,
          paidLeaveComplianceRate: plRate,
        }
      },
    )
    divisionHeatmap.sort((a, b) => b.avgOvertimeMinutes - a.avgOvertimeMinutes)

    return {
      ok: true,
      data: {
        yearMonth,
        overtimeAlerts: unresolvedAlerts,
        paidLeaveProgress,
        article36Subjects,
        divisionHeatmap,
        summary: {
          unresolvedAlertCount: unresolvedAlerts.length,
          paidLeaveAtRiskCount: paidLeaveProgress.filter((r) => r.atRisk).length,
          article36SubjectCount: article36Subjects.length,
          totalEmployees: emps.length,
        },
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}
```

- [ ] **Step 2: 型チェック実行**

```bash
npm run type-check
```

期待結果: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/labor-compliance/queries.ts
git commit -m "feat: add labor-compliance queries"
```

---

## Task 4: ルートグループとページファイルの作成

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/error.tsx`

**注意:** `(labor_compliance)` はルートグループ（URLパスに含まれない）。実際のURLは `/adm/labor-compliance`。

- [ ] **Step 1: loading.tsx を作成**

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
```

- [ ] **Step 2: error.tsx を作成**

```typescript
'use client'

import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Alert variant="destructive">
        <AlertTitle>エラーが発生しました</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message}
          <div className="mt-4">
            <Button onClick={reset} variant="outline" size="sm">
              再読み込み
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
```

- [ ] **Step 3: page.tsx を作成**

```typescript
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getJSTYearMonth } from '@/lib/datetime'
import { getLaborComplianceBundle } from '@/features/labor-compliance/queries'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import LaborComplianceDashboard from './components/LaborComplianceDashboard'

export const metadata = { title: '労務コンプライアンスダッシュボード' }

export default async function LaborCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  // hr / hr_manager / tenant_admin / developer のみアクセス可
  const allowedRoles = ['hr', 'hr_manager', 'tenant_admin', 'developer']
  if (!allowedRoles.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const sp = await searchParams
  const raw = Array.isArray(sp.ym) ? sp.ym[0] : sp.ym
  const yearMonth =
    raw && /^\d{4}-\d{2}$/.test(raw) ? raw : getJSTYearMonth()

  const result = await getLaborComplianceBundle(yearMonth)

  if (!result.ok) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>データを読み込めませんでした</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <LaborComplianceDashboard bundle={result.data} />
}
```

- [ ] **Step 4: 型チェック実行**

```bash
npm run type-check
```

期待結果: `LaborComplianceDashboard` がまだないためエラーが出る（次タスクで解消）

- [ ] **Step 5: コミット（エラーあり状態でも OK — 次タスクで解消）**

```bash
git add "src/app/(tenant)/(colored)/adm/(labor_compliance)/"
git commit -m "feat: add labor-compliance page scaffold"
```

---

## Task 5: メイン Client Component の実装

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/LaborComplianceDashboard.tsx`

- [ ] **Step 1: LaborComplianceDashboard.tsx を作成**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LaborComplianceBundle } from '@/features/labor-compliance/types'
import { OvertimeAlertPanel } from './OvertimeAlertPanel'
import { PaidLeavePanel } from './PaidLeavePanel'
import { Article36Panel } from './Article36Panel'
import { DivisionHeatmap } from './DivisionHeatmap'

type Tab = 'overtime' | 'paid_leave' | 'article36' | 'heatmap'

type Props = { bundle: LaborComplianceBundle }

export default function LaborComplianceDashboard({ bundle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overtime')
  const router = useRouter()

  const { summary, yearMonth } = bundle

  function handleMonthChange(ym: string) {
    router.push(`?ym=${ym}`)
  }

  function shiftMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    {
      key: 'overtime',
      label: '残業アラート',
      count: summary.unresolvedAlertCount,
      color: summary.unresolvedAlertCount > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      key: 'paid_leave',
      label: '有休取得義務',
      count: summary.paidLeaveAtRiskCount,
      color: summary.paidLeaveAtRiskCount > 0 ? 'text-amber-600' : 'text-green-600',
    },
    {
      key: 'article36',
      label: '36協定特別条項',
      count: summary.article36SubjectCount,
      color: summary.article36SubjectCount > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      key: 'heatmap',
      label: '部署別ヒートマップ',
      count: 0,
      color: '',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">労務コンプライアンスダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">36協定・有休義務・残業アラートを一元管理</p>
        </div>
        {/* 月選択 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMonthChange(shiftMonth(yearMonth, -1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            aria-label="前月"
          >
            ←
          </button>
          <span className="text-sm font-medium px-3">
            {yearMonth.replace('-', '年')}月
          </span>
          <button
            onClick={() => handleMonthChange(shiftMonth(yearMonth, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            aria-label="翌月"
          >
            →
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">総従業員数</p>
          <p className="text-2xl font-bold text-gray-900">
            {summary.totalEmployees}<span className="text-sm font-normal ml-1">名</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">未解決アラート</p>
          <p className={`text-2xl font-bold ${summary.unresolvedAlertCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.unresolvedAlertCount}<span className="text-sm font-normal ml-1">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">有休義務未達リスク</p>
          <p className={`text-2xl font-bold ${summary.paidLeaveAtRiskCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {summary.paidLeaveAtRiskCount}<span className="text-sm font-normal ml-1">名</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">36協定特別条項対象</p>
          <p className={`text-2xl font-bold ${summary.article36SubjectCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.article36SubjectCount}<span className="text-sm font-normal ml-1">名</span>
          </p>
        </div>
      </div>

      {/* タブ */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="タブ">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 text-xs font-bold ${tab.color}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'overtime' && (
          <OvertimeAlertPanel alerts={bundle.overtimeAlerts} />
        )}
        {activeTab === 'paid_leave' && (
          <PaidLeavePanel rows={bundle.paidLeaveProgress} yearMonth={yearMonth} />
        )}
        {activeTab === 'article36' && (
          <Article36Panel rows={bundle.article36Subjects} />
        )}
        {activeTab === 'heatmap' && (
          <DivisionHeatmap rows={bundle.divisionHeatmap} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット（子 Component はまだないので型エラーあり — 次タスクで解消）**

```bash
git add "src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/LaborComplianceDashboard.tsx"
git commit -m "feat: add LaborComplianceDashboard client component"
```

---

## Task 6: 残業アラートパネルの実装

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/OvertimeAlertPanel.tsx`

- [ ] **Step 1: OvertimeAlertPanel.tsx を作成**

```typescript
'use client'

import type { OvertimeAlertDisplayRow } from '@/features/labor-compliance/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type Props = { alerts: OvertimeAlertDisplayRow[] }

const SEVERITY_STYLES: Record<string, { badge: string; row: string }> = {
  critical: {
    badge: 'bg-red-100 text-red-700 border border-red-200',
    row: 'bg-red-50/30',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    row: 'bg-amber-50/30',
  },
  caution: {
    badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    row: '',
  },
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: '緊急',
  warning: '警告',
  caution: '注意',
}

export function OvertimeAlertPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-green-600 font-medium text-lg">✓ 未解決の残業アラートはありません</p>
        <p className="text-gray-400 text-sm mt-2">すべての従業員が法令基準内で勤務しています</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">未解決の残業アラート</h2>
        <span className="text-xs text-gray-500">{alerts.length} 件</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left font-medium">重要度</th>
              <th className="px-4 py-3 text-left font-medium">社員番号</th>
              <th className="px-4 py-3 text-left font-medium">氏名</th>
              <th className="px-4 py-3 text-left font-medium">部署</th>
              <th className="px-4 py-3 text-left font-medium">アラート種別</th>
              <th className="px-4 py-3 text-left font-medium">発生日時</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alerts.map((alert) => {
              const styles = SEVERITY_STYLES[alert.severityLevel] ?? SEVERITY_STYLES.caution
              const triggeredDate = alert.triggeredAt
                ? format(new Date(alert.triggeredAt), 'M月d日', { locale: ja })
                : '—'
              return (
                <tr key={alert.id} className={`hover:bg-gray-50 transition-colors ${styles.row}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}>
                      {SEVERITY_LABELS[alert.severityLevel]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {alert.employeeNo ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{alert.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{alert.divisionName}</td>
                  <td className="px-4 py-3 text-gray-700">{alert.alertTypeLabel}</td>
                  <td className="px-4 py-3 text-gray-500">{triggeredDate}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/OvertimeAlertPanel.tsx"
git commit -m "feat: add OvertimeAlertPanel component"
```

---

## Task 7: 有休取得義務進捗パネルの実装

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/PaidLeavePanel.tsx`

- [ ] **Step 1: PaidLeavePanel.tsx を作成**

```typescript
'use client'

import type { PaidLeaveProgressRow } from '@/features/labor-compliance/types'

type Props = {
  rows: PaidLeaveProgressRow[]
  yearMonth: string
}

export function PaidLeavePanel({ rows, yearMonth }: Props) {
  const [y, m] = yearMonth.split('-').map(Number)
  const fiscalYear = m >= 4 ? y : y - 1
  const fiscalEndDate = `${fiscalYear + 1}年3月`

  const atRiskRows = rows.filter((r) => r.atRisk)
  const safeRows = rows.filter((r) => !r.atRisk)

  return (
    <div className="space-y-4">
      {/* 注意書き */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <span className="font-medium">年5日有休取得義務（労基法39条7項）</span>：
        {fiscalYear}年4月〜{fiscalEndDate}の期間で年5日以上の有休取得が必要です。
        work_time_recordsのis_holiday=trueの日数を取得日数として集計しています。
      </div>

      {/* リスクあり */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <h2 className="text-base font-semibold text-gray-900">未達リスクあり</h2>
          <span className="ml-auto text-xs text-gray-500">{atRiskRows.length} 名</span>
        </div>
        {atRiskRows.length === 0 ? (
          <p className="px-6 py-8 text-center text-green-600 font-medium">
            ✓ 全員が義務取得日数を達成しています
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">社員番号</th>
                  <th className="px-4 py-3 text-left font-medium">氏名</th>
                  <th className="px-4 py-3 text-left font-medium">部署</th>
                  <th className="px-4 py-3 text-left font-medium">取得日数</th>
                  <th className="px-4 py-3 text-left font-medium">進捗</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {atRiskRows.map((row) => {
                  const pct = Math.min(100, Math.round((row.takenDays / 5) * 100))
                  return (
                    <tr key={row.employeeId} className="hover:bg-gray-50 bg-amber-50/20">
                      <td className="px-4 py-3 text-gray-500 tabular-nums">
                        {row.employeeNo ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.divisionName}</td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="font-bold text-amber-700">{row.takenDays}</span>
                        <span className="text-gray-400 text-xs"> / 5日</span>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 達成済み（折りたたみ可能） */}
      <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          達成済み（{safeRows.length} 名）
        </summary>
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">社員番号</th>
                <th className="px-4 py-3 text-left font-medium">氏名</th>
                <th className="px-4 py-3 text-left font-medium">部署</th>
                <th className="px-4 py-3 text-left font-medium">取得日数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {safeRows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {row.employeeNo ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.divisionName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="font-bold text-green-600">{row.takenDays}</span>
                    <span className="text-gray-400 text-xs"> / 5日</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/PaidLeavePanel.tsx"
git commit -m "feat: add PaidLeavePanel component"
```

---

## Task 8: 36協定特別条項パネルの実装

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/Article36Panel.tsx`

- [ ] **Step 1: Article36Panel.tsx を作成**

```typescript
'use client'

import type { Article36SubjectRow } from '@/features/labor-compliance/types'

type Props = { rows: Article36SubjectRow[] }

export function Article36Panel({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-green-600 font-medium text-lg">✓ 36協定特別条項の対象者はいません</p>
        <p className="text-gray-400 text-sm mt-2">
          直近12ヶ月に月100時間超または年360時間超の残業アラートがありません
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
        <span className="font-medium">36協定特別条項（労基法36条5項）</span>：
        臨時的な特別の事情があっても、年6回まで・月100時間未満・年720時間以内の上限があります。
        以下は直近12ヶ月に月100時間超または年360時間超アラートが発生した従業員です。
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">36協定特別条項の対象者</h2>
          <span className="text-xs text-gray-500">{rows.length} 名</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">社員番号</th>
                <th className="px-4 py-3 text-left font-medium">氏名</th>
                <th className="px-4 py-3 text-left font-medium">部署</th>
                <th className="px-4 py-3 text-center font-medium">月100h超（回）</th>
                <th className="px-4 py-3 text-center font-medium">月45h超（回）</th>
                <th className="px-4 py-3 text-center font-medium">年360h超</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-gray-50 bg-red-50/10">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {row.employeeNo ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.divisionName}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        row.monthOver100Count >= 6
                          ? 'bg-red-100 text-red-700'
                          : row.monthOver100Count >= 3
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {row.monthOver100Count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-700 tabular-nums">{row.monthOver45Count}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.hasAnnualExceeded ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        超過
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/Article36Panel.tsx"
git commit -m "feat: add Article36Panel component"
```

---

## Task 9: 部署別ヒートマップの実装

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/DivisionHeatmap.tsx`

- [ ] **Step 1: DivisionHeatmap.tsx を作成**

```typescript
'use client'

import type { DivisionHeatmapRow } from '@/features/labor-compliance/types'

type Props = { rows: DivisionHeatmapRow[] }

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

function getOvertimeHeatColor(avgMinutes: number): string {
  if (avgMinutes >= 80 * 60) return 'bg-red-500 text-white'
  if (avgMinutes >= 45 * 60) return 'bg-amber-400 text-white'
  if (avgMinutes >= 20 * 60) return 'bg-yellow-200 text-gray-800'
  return 'bg-green-100 text-gray-700'
}

function getPaidLeaveHeatColor(rate: number): string {
  if (rate >= 80) return 'bg-green-100 text-gray-700'
  if (rate >= 50) return 'bg-yellow-200 text-gray-800'
  if (rate >= 30) return 'bg-amber-400 text-white'
  return 'bg-red-500 text-white'
}

export function DivisionHeatmap({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-gray-500">部署データがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 凡例 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">残業時間（平均）凡例</p>
        <div className="flex gap-3 flex-wrap text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-100 border border-green-200" /> 20h未満
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-200 border border-yellow-300" /> 20〜45h
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-amber-400" /> 45〜80h（法的リスク）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-red-500" /> 80h超（特別条項上限接近）
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">部署別ヒートマップ</h2>
          <p className="text-xs text-gray-500 mt-1">残業率・有休取得率を部署単位で比較</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">部署名</th>
                <th className="px-4 py-3 text-center font-medium">人数</th>
                <th className="px-4 py-3 text-center font-medium">平均残業時間</th>
                <th className="px-4 py-3 text-center font-medium">法令リスク者数</th>
                <th className="px-4 py-3 text-center font-medium">有休義務達成率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.divisionId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.divisionName}</td>
                  <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                    {row.employeeCount}名
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded px-3 py-1 text-sm font-bold tabular-nums ${getOvertimeHeatColor(row.avgOvertimeMinutes)}`}
                    >
                      {minutesToHours(row.avgOvertimeMinutes)}h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.legalRiskCount > 0 ? (
                      <span className="inline-flex items-center justify-center rounded px-3 py-1 text-sm font-bold bg-red-100 text-red-700">
                        {row.legalRiskCount}名
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium text-sm">なし</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded px-3 py-1 text-sm font-bold tabular-nums ${getPaidLeaveHeatColor(row.paidLeaveComplianceRate)}`}
                    >
                      {row.paidLeaveComplianceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/components/DivisionHeatmap.tsx"
git commit -m "feat: add DivisionHeatmap component"
```

---

## Task 10: 型チェック・ビルド確認と動作検証

**Files:**
- 変更なし（検証のみ）

- [ ] **Step 1: 全型チェック実行**

```bash
npm run type-check
```

期待結果: エラーなし

- [ ] **Step 2: lint 実行**

```bash
npm run lint
```

期待結果: エラーなし。警告があれば `npm run lint:fix` で修正。

- [ ] **Step 3: 開発サーバー起動して画面確認**

```bash
npm run dev
```

ブラウザで `http://localhost:3000/adm/labor-compliance` にアクセスし、以下を確認：

1. ページがエラーなく表示される
2. サマリーカード（総従業員数・未解決アラート・有休義務未達・36協定対象）が表示される
3. 残業アラートタブ：テーブルが表示される（データがない場合は安全メッセージ）
4. 有休取得義務タブ：リスクあり・達成済みに分かれて表示される
5. 36協定特別条項タブ：対象者がいない場合は安全メッセージ
6. 部署別ヒートマップタブ：ヒートカラーでテーブル表示
7. 月選択（← →）で `?ym=YYYY-MM` のクエリパラメータが変わる

- [ ] **Step 4: 最終コミット**

```bash
git add .
git commit -m "feat: P1-B labor compliance dashboard - complete implementation"
```

---

## 自己レビューチェックリスト

### スペックカバレッジ

| 要件（仕様書） | 実装タスク |
|---|---|
| 残業アラート一覧（月45h・年360hライン） | Task 3 (queries) + Task 6 (OvertimeAlertPanel) |
| 有休取得義務進捗（年5日未達リスク者リスト） | Task 3 (queries) + Task 7 (PaidLeavePanel) |
| 36協定特別条項対象者カウント | Task 3 (queries) + Task 8 (Article36Panel) |
| 部署別ヒートマップ（残業率・有休取得率） | Task 3 (queries) + Task 9 (DivisionHeatmap) |
| ルート `/adm/labor-compliance` | Task 1 + Task 4 |
| loading.tsx / error.tsx | Task 4 |
| 既存データを破壊しない（新テーブルなし） | マイグレーション不要、SELECT のみ |

### 禁止事項確認

- [x] `createAdminClient()` を actions.ts で使用しない（queries.ts は Server Component から直接呼ぶ）
- [x] URL ハードコードなし（APP_ROUTES を使用）
- [x] 新テーブル追加なし（`supabase db reset` 不要）
- [x] RLS バイパスなし（`createClient()` のみ使用）

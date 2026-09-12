# 工数×残業クロス分析ダッシュボード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** テナント管理者向けに、残業実績（`monthly_employee_overtime`）とタスク工数記録（`task_work_logs`）を従業員×月単位で突き合わせ、継続的残業・申告乖離・タスク時間集中の3指標から「要注意メンバー」を検知して一覧表示する新規ページ `/adm/workload-burnout-analysis` を実装する。

**Architecture:** 新規ドメイン `src/features/workload-analysis/` を新設する。判定ロジックは`cross-analysis.ts`に純粋関数として実装しTDDでテストする。データ取得は`queries.ts`が担い、既存の`src/utils/overtimeThresholds.ts`（残業ステータス判定）と`src/features/task-management/division-tree.ts`（部門ツリー絞り込み）・`getTenantDivisions`（部門一覧取得）を重複実装せずそのまま再利用する。UIはServer Component（`page.tsx`）がクエリ結果をpropsで渡す既存パターン（タスク健康度ダッシュボードと同一）に従う。

**Tech Stack:** Next.js App Router（Server Component）、Supabase（`createClient()`、RLS有効）、TypeScript、Recharts、`node --import tsx --test` + `node:assert/strict`

**Spec:** `docs/implementation-plan-workload-overtime-cross-analysis.md`

## Global Constraints

- 検知ロジックのしきい値（`docs/implementation-plan-workload-overtime-cross-analysis.md` 3章より）：
  - 分析対象期間: 直近6ヶ月（`ANALYSIS_WINDOW_MONTHS = 6`）
  - 継続的残業フラグ: 直近3ヶ月（`SUSTAINED_OVERTIME_LOOKBACK_MONTHS = 3`）のうち2ヶ月以上（`SUSTAINED_OVERTIME_MIN_WARNING_MONTHS = 2`）が`warning`以上
  - 申告乖離フラグ: 残業時間が`monthlyWarning`（既定40h）超、かつ申告工数が残業時間の30%未満（`UNDER_REPORTED_GAP_RATIO = 0.3`）。その月に`task_work_logs`が1件もない場合は判定対象から除外
  - タスク集中フラグ: 直近月の申告工数が部門内「他メンバー」平均の1.5倍超（`WORKLOAD_CONCENTRATION_MULTIPLIER = 1.5`）、かつ絶対値20時間以上（`WORKLOAD_CONCENTRATION_MIN_HOURS = 20`）
  - 要注意判定: 上記3フラグのうち2つ以上該当（`ATTENTION_NEEDED_MIN_FLAGS = 2`）
- 既存ロジックは再実装しない：残業ステータス判定は`src/utils/overtimeThresholds.ts`の`getOvertimeThresholds`/`getSingleMonthStatus`をそのままimportして使う。部門ツリー絞り込みは`src/features/task-management/division-tree.ts`の`collectDivisionAndDescendantIds`、部門一覧取得は`src/features/task-management/queries.ts`の`getTenantDivisions`、権限判定は`src/features/task-management/permissions.ts`の`isTenantAdmin`をそのままimportする
- RLSは`createClient()`（RLS有効）のみを使う。`createAdminClient()`は使わない
- 新規ルートは`/adm/workload-burnout-analysis`。`APP_ROUTES`定数を経由する（URLのハードコード禁止）
- メニュー登録は既存カテゴリ「勤務：分析」に追加する。新規カテゴリは作らない。`app_role_service`には登録しない
- レイアウトはCLAUDE.mdの「パターンB: フル幅型」＋カード間隔標準（`space-y-4`/`gap-3`/`rounded-lg`/`shadow-xs`）に準拠する
- PostgRESTの1000行上限に対応するため、DB全件取得は`.range()`によるページネーションヘルパー（`fetchAllRows`）を使う（既存`task-management/queries.ts`と同じパターンをこのドメイン内に複製する。ドメインをまたいだ共有ユーティリティ化はしない — `saas-dashboard`も同様に複製している既存踏襲）

---

### Task 1: 判定ロジック（`cross-analysis.ts`）

**Files:**

- Create: `src/features/workload-analysis/cross-analysis.ts`
- Test: `src/features/workload-analysis/cross-analysis.test.ts`

**Interfaces:**

- Consumes: `OvertimeStatus`, `OvertimeThresholds`, `DEFAULT_THRESHOLDS`, `getSingleMonthStatus` from `@/utils/overtimeThresholds`（既存ファイル、変更しない）
- Produces: `ANALYSIS_WINDOW_MONTHS: number`、`buildRecentYearMonths(count: number, referenceYmd: string): string[]`、`computeEmployeeCrossAnalysis(input: EmployeeCrossAnalysisInput, thresholds: OvertimeThresholds, divisionAverageLoggedHours: number): EmployeeCrossAnalysisResult`、型`MonthlyOvertimeInput`/`MonthlyWorkLogInput`/`EmployeeCrossAnalysisInput`/`MonthlyCrossPoint`/`EmployeeCrossAnalysisFlags`/`EmployeeCrossAnalysisResult` — Task 3（`queries.ts`）とTask 4（UIコンポーネント）が使用する

- [ ] **Step 1: 失敗するテストを書く**

`src/features/workload-analysis/cross-analysis.test.ts` を新規作成する：

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_THRESHOLDS } from '@/utils/overtimeThresholds'
import {
  ANALYSIS_WINDOW_MONTHS,
  buildRecentYearMonths,
  computeEmployeeCrossAnalysis,
  type EmployeeCrossAnalysisInput,
} from './cross-analysis'

test('ANALYSIS_WINDOW_MONTHS は6ヶ月', () => {
  assert.equal(ANALYSIS_WINDOW_MONTHS, 6)
})

test('buildRecentYearMonths: 基準月を含む直近N ヶ月を昇順で返す', () => {
  assert.deepEqual(buildRecentYearMonths(3, '2026-09-15'), ['2026-07', '2026-08', '2026-09'])
})

test('buildRecentYearMonths: 年をまたぐ場合も正しく計算する', () => {
  assert.deepEqual(buildRecentYearMonths(3, '2026-01-10'), ['2025-11', '2025-12', '2026-01'])
})

function makeInput(
  overtimeHoursList: number[],
  workLogList: Array<{ hours: number; hasAnyLog: boolean }>
): EmployeeCrossAnalysisInput {
  const yearMonths = buildRecentYearMonths(overtimeHoursList.length, '2026-09-01')
  return {
    employeeId: 'emp-1',
    employeeName: 'テスト太郎',
    divisionId: 'div-1',
    divisionName: '開発部',
    overtimeMonths: yearMonths.map((ym, i) => ({
      yearMonth: ym,
      overtimeHours: overtimeHoursList[i],
    })),
    workLogMonths: yearMonths.map((ym, i) => ({
      yearMonth: ym,
      loggedHours: workLogList[i].hours,
      hasAnyLog: workLogList[i].hasAnyLog,
    })),
  }
}

test('継続的残業フラグ: 直近3ヶ月中2ヶ月がwarning以上なら該当', () => {
  // 46h は monthlyLimit(45h) 超なので warning。30h は safe。
  const input = makeInput(
    [30, 46, 46],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.flags.sustainedOvertime, true)
  // 単独では要注意（2フラグ以上）に届かない
  assert.equal(result.isAttentionNeeded, false)
})

test('継続的残業フラグ: 直近3ヶ月中1ヶ月のみwarning以上なら非該当', () => {
  const input = makeInput(
    [30, 46, 30],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.flags.sustainedOvertime, false)
})

test('申告乖離フラグ: 残業40h超・申告工数が30%未満なら該当し理由を含む', () => {
  const input = makeInput(
    [20, 20, 42],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 5, hasAnyLog: true }, // 5/42 ≈ 11.9%
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.flags.underReportedGap, true)
  assert.ok(result.reasons.some(r => r.includes('42h') && r.includes('5h')))
})

test('申告乖離フラグ: 工数記録が1件もない月は判定対象から除外する', () => {
  const input = makeInput(
    [20, 20, 42],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false }, // hasAnyLog=false（記録なし。0件と乖離を区別する）
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.flags.underReportedGap, false)
})

test('申告乖離フラグ: 乖離率が30%以上なら非該当', () => {
  const input = makeInput(
    [20, 20, 42],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 15, hasAnyLog: true }, // 15/42 ≈ 35.7%
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.flags.underReportedGap, false)
})

test('タスク集中フラグ: 部門平均の1.5倍超かつ20h以上なら該当', () => {
  const input = makeInput(
    [10, 10, 10],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 25, hasAnyLog: true },
    ]
  )
  // 部門平均10h → 1.5倍=15h。25hは15h超かつ20h以上
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 10)
  assert.equal(result.flags.workloadConcentration, true)
})

test('タスク集中フラグ: 倍率は満たすが絶対値20h未満なら非該当', () => {
  const input = makeInput(
    [10, 10, 10],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 10, hasAnyLog: true },
    ]
  )
  // 部門平均5h → 1.5倍=7.5h。10hは7.5h超だが20h未満
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 5)
  assert.equal(result.flags.workloadConcentration, false)
})

test('タスク集中フラグ: 絶対値は満たすが倍率未達なら非該当', () => {
  const input = makeInput(
    [10, 10, 10],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 25, hasAnyLog: true },
    ]
  )
  // 部門平均20h → 1.5倍=30h。25hは30h未満
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 20)
  assert.equal(result.flags.workloadConcentration, false)
})

test('タスク集中フラグ: 部門平均0でも本人の工数が20h以上なら該当（一人に集中）', () => {
  const input = makeInput(
    [10, 10, 10],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 20, hasAnyLog: true },
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.flags.workloadConcentration, true)
})

test('要注意判定: 2フラグ以上該当でtrue、理由が両方含まれる', () => {
  const input = makeInput(
    [46, 46, 46],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 25, hasAnyLog: true },
    ]
  )
  // sustainedOvertime: 46hが3ヶ月連続でwarning以上 → true
  // workloadConcentration: 部門平均10h → 1.5倍=15h、25hは該当 → true
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 10)
  assert.equal(result.flags.sustainedOvertime, true)
  assert.equal(result.flags.workloadConcentration, true)
  assert.equal(result.isAttentionNeeded, true)
  assert.ok(result.reasons.length >= 2)
})

test('gapRatio: 工数記録なしの月はnull', () => {
  const input = makeInput([42], [{ hours: 0, hasAnyLog: false }])
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.months[0].gapRatio, null)
})

test('gapRatio: 残業0hの月はnull（0除算を避ける）', () => {
  const input = makeInput([0], [{ hours: 5, hasAnyLog: true }])
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.months[0].gapRatio, null)
})

test('gapRatio: 残業ありかつ工数記録ありなら比率を計算する', () => {
  const input = makeInput([40], [{ hours: 10, hasAnyLog: true }])
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.months[0].gapRatio, 0.25)
})

test('overtimeStatus: 各月に既存のgetSingleMonthStatus相当のステータスが付与される', () => {
  const input = makeInput(
    [30, 50, 90],
    [
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
      { hours: 0, hasAnyLog: false },
    ]
  )
  const result = computeEmployeeCrossAnalysis(input, DEFAULT_THRESHOLDS, 0)
  assert.equal(result.months[0].overtimeStatus, 'safe')
  assert.equal(result.months[1].overtimeStatus, 'warning')
  assert.equal(result.months[2].overtimeStatus, 'critical')
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --import tsx --test "src/features/workload-analysis/cross-analysis.test.ts"`
Expected: FAIL（`./cross-analysis` が存在しない）

- [ ] **Step 3: 実装する**

`src/features/workload-analysis/cross-analysis.ts` を新規作成する：

```typescript
/**
 * 残業実績（monthly_employee_overtime）とタスク工数記録（task_work_logs）を
 * 従業員×月単位で突き合わせ、負荷偏り・バーンアウト予兆を検知する純粋関数群。
 *
 * docs/implementation-plan-workload-overtime-cross-analysis.md 3章の仕様に対応する。
 * 残業ステータス判定は src/utils/overtimeThresholds.ts の既存ロジックをそのまま使い、
 * ここでは再実装しない。
 */

import {
  getSingleMonthStatus,
  type OvertimeStatus,
  type OvertimeThresholds,
} from '@/utils/overtimeThresholds'

/** 分析対象期間（月数） */
export const ANALYSIS_WINDOW_MONTHS = 6

const SUSTAINED_OVERTIME_LOOKBACK_MONTHS = 3
const SUSTAINED_OVERTIME_MIN_WARNING_MONTHS = 2
const UNDER_REPORTED_GAP_RATIO = 0.3
const WORKLOAD_CONCENTRATION_MULTIPLIER = 1.5
const WORKLOAD_CONCENTRATION_MIN_HOURS = 20
const ATTENTION_NEEDED_MIN_FLAGS = 2

const WARNING_OR_ABOVE_STATUSES: readonly OvertimeStatus[] = [
  'warning',
  'danger',
  'critical',
  'violation',
]

/**
 * 基準日（YYYY-MM-DD）から遡って直近 count ヶ月分の 'YYYY-MM' を昇順で返す（基準日の月を含む）。
 */
export function buildRecentYearMonths(count: number, referenceYmd: string): string[] {
  const [refYear, refMonth] = referenceYmd.split('-').map(Number)
  const result: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - 1 - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${y}-${m}`)
  }
  return result
}

export interface MonthlyOvertimeInput {
  yearMonth: string
  overtimeHours: number
}

export interface MonthlyWorkLogInput {
  yearMonth: string
  loggedHours: number
  /** その月に task_work_logs が1件でもあるか（0件と「申告0h」を区別するため） */
  hasAnyLog: boolean
}

export interface EmployeeCrossAnalysisInput {
  employeeId: string
  employeeName: string
  divisionId: string | null
  divisionName: string | null
  /** 昇順・ANALYSIS_WINDOW_MONTHS ヶ月分、workLogMonths と同じ yearMonth 集合 */
  overtimeMonths: MonthlyOvertimeInput[]
  /** 昇順・ANALYSIS_WINDOW_MONTHS ヶ月分、overtimeMonths と同じ yearMonth 集合 */
  workLogMonths: MonthlyWorkLogInput[]
}

export interface MonthlyCrossPoint {
  yearMonth: string
  overtimeHours: number
  overtimeStatus: OvertimeStatus
  loggedHours: number
  hasAnyLog: boolean
  /** loggedHours / overtimeHours。hasAnyLog=false または overtimeHours=0 の場合は null */
  gapRatio: number | null
}

export interface EmployeeCrossAnalysisFlags {
  sustainedOvertime: boolean
  underReportedGap: boolean
  workloadConcentration: boolean
}

export interface EmployeeCrossAnalysisResult {
  employeeId: string
  employeeName: string
  divisionId: string | null
  divisionName: string | null
  months: MonthlyCrossPoint[]
  flags: EmployeeCrossAnalysisFlags
  isAttentionNeeded: boolean
  reasons: string[]
}

function isWarningOrAbove(status: OvertimeStatus): boolean {
  return WARNING_OR_ABOVE_STATUSES.includes(status)
}

function buildMonthlyCrossPoints(
  input: EmployeeCrossAnalysisInput,
  thresholds: OvertimeThresholds
): MonthlyCrossPoint[] {
  const workLogByMonth = new Map(input.workLogMonths.map(m => [m.yearMonth, m]))

  return input.overtimeMonths.map(om => {
    const wl = workLogByMonth.get(om.yearMonth) ?? {
      yearMonth: om.yearMonth,
      loggedHours: 0,
      hasAnyLog: false,
    }
    const overtimeStatus = getSingleMonthStatus(om.overtimeHours, thresholds)
    const gapRatio = wl.hasAnyLog && om.overtimeHours > 0 ? wl.loggedHours / om.overtimeHours : null

    return {
      yearMonth: om.yearMonth,
      overtimeHours: om.overtimeHours,
      overtimeStatus,
      loggedHours: wl.loggedHours,
      hasAnyLog: wl.hasAnyLog,
      gapRatio,
    }
  })
}

function detectSustainedOvertime(months: MonthlyCrossPoint[]): boolean {
  const recent = months.slice(-SUSTAINED_OVERTIME_LOOKBACK_MONTHS)
  const warningCount = recent.filter(m => isWarningOrAbove(m.overtimeStatus)).length
  return warningCount >= SUSTAINED_OVERTIME_MIN_WARNING_MONTHS
}

function detectUnderReportedGap(
  months: MonthlyCrossPoint[],
  thresholds: OvertimeThresholds
): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = []
  for (const m of months) {
    if (m.gapRatio === null) continue // 記録なし月・残業0h月は判定対象外
    if (m.overtimeHours <= thresholds.monthlyWarning) continue
    if (m.gapRatio < UNDER_REPORTED_GAP_RATIO) {
      const pct = Math.round(m.gapRatio * 100)
      reasons.push(`${m.yearMonth}: 残業${m.overtimeHours}h・申告工数${m.loggedHours}h（${pct}%）`)
    }
  }
  return { flagged: reasons.length > 0, reasons }
}

/**
 * 従業員1名分の月次残業・工数データから、負荷偏り・バーンアウト予兆の3フラグと
 * 要注意判定を算出する。
 *
 * @param divisionAverageLoggedHours - 同一部門の「他メンバー」の直近月申告工数平均
 *   （呼び出し側があらかじめ算出して渡す。3.3参照）
 */
export function computeEmployeeCrossAnalysis(
  input: EmployeeCrossAnalysisInput,
  thresholds: OvertimeThresholds,
  divisionAverageLoggedHours: number
): EmployeeCrossAnalysisResult {
  const months = buildMonthlyCrossPoints(input, thresholds)

  const sustainedOvertime = detectSustainedOvertime(months)
  const gapResult = detectUnderReportedGap(months, thresholds)

  const latestMonth = months[months.length - 1] ?? null
  const latestLoggedHours = latestMonth?.loggedHours ?? 0
  const workloadConcentration =
    latestLoggedHours >= divisionAverageLoggedHours * WORKLOAD_CONCENTRATION_MULTIPLIER &&
    latestLoggedHours >= WORKLOAD_CONCENTRATION_MIN_HOURS

  const flags: EmployeeCrossAnalysisFlags = {
    sustainedOvertime,
    underReportedGap: gapResult.flagged,
    workloadConcentration,
  }

  const trueFlagCount = Object.values(flags).filter(Boolean).length
  const isAttentionNeeded = trueFlagCount >= ATTENTION_NEEDED_MIN_FLAGS

  const reasons: string[] = []
  if (sustainedOvertime) {
    reasons.push(
      `直近${SUSTAINED_OVERTIME_LOOKBACK_MONTHS}ヶ月中${SUSTAINED_OVERTIME_MIN_WARNING_MONTHS}ヶ月以上が「注意」以上の残業ステータス`
    )
  }
  if (gapResult.flagged) {
    reasons.push(...gapResult.reasons.map(r => `申告乖離: ${r}`))
  }
  if (workloadConcentration && latestMonth) {
    reasons.push(
      `${latestMonth.yearMonth}: 申告工数${latestLoggedHours}hが部門平均${divisionAverageLoggedHours.toFixed(1)}hの${WORKLOAD_CONCENTRATION_MULTIPLIER}倍以上`
    )
  }

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    divisionId: input.divisionId,
    divisionName: input.divisionName,
    months,
    flags,
    isAttentionNeeded,
    reasons,
  }
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --import tsx --test "src/features/workload-analysis/cross-analysis.test.ts"`
Expected: PASS（全テストがグリーン）

- [ ] **Step 5: コミット**

```bash
git add src/features/workload-analysis/cross-analysis.ts src/features/workload-analysis/cross-analysis.test.ts
git commit -m "feat: 工数×残業クロス分析の検知ロジック（cross-analysis.ts）を追加"
```

---

### Task 2: ルート定数の追加

**Files:**

- Modify: `src/config/routes.ts`

**Interfaces:**

- Produces: `APP_ROUTES.TENANT.ADMIN_WORKLOAD_BURNOUT_ANALYSIS: string` — Task 7（page.tsx）が使用する

- [ ] **Step 1: `APP_ROUTES.TENANT` に定数を追加する**

`src/config/routes.ts` の `ADMIN_TASK_HEALTH: '/adm/task-health',` の直後に追加する：

```typescript
    /** タスク健康度ダッシュボード（組織横断のタスク進捗・滞留・負荷偏在の可視化） */
    ADMIN_TASK_HEALTH: '/adm/task-health',
    /** 工数×残業クロス分析ダッシュボード（負荷偏り・バーンアウト予兆の検知） */
    ADMIN_WORKLOAD_BURNOUT_ANALYSIS: '/adm/workload-burnout-analysis',
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/config/routes.ts
git commit -m "feat: 工数×残業クロス分析ダッシュボードのルート定数を追加"
```

---

### Task 3: クエリ関数（`queries.ts`）

**Files:**

- Create: `src/features/workload-analysis/queries.ts`

**Interfaces:**

- Consumes: `computeEmployeeCrossAnalysis`/`buildRecentYearMonths`/`ANALYSIS_WINDOW_MONTHS`/型（Task 1の`./cross-analysis`）、`getOvertimeThresholds`（`@/utils/overtimeThresholds`）、`getTenantDivisions`/`collectDivisionAndDescendantIds`（`@/features/task-management/queries`・`@/features/task-management/division-tree`）、`toJSTDateString`（`@/lib/datetime`）
- Produces: `getWorkloadOvertimeCrossData(supabase, options?: { divisionId?: string }): Promise<EmployeeCrossAnalysisResult[]>` — Task 7（page.tsx）が使用する

このタスクはDB読み取りのみのためユニットテストは書かず、ローカルSupabase実DBに対する動作確認で代替する（Global Constraints・既存`queries.ts`と同じ設計判断）。

- [ ] **Step 1: 実装する**

`src/features/workload-analysis/queries.ts` を新規作成する：

```typescript
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getOvertimeThresholds } from '@/utils/overtimeThresholds'
import { getTenantDivisions, type DivisionOption } from '@/features/task-management/queries'
import { collectDivisionAndDescendantIds } from '@/features/task-management/division-tree'
import { toJSTDateString } from '@/lib/datetime'
import {
  computeEmployeeCrossAnalysis,
  buildRecentYearMonths,
  ANALYSIS_WINDOW_MONTHS,
  type EmployeeCrossAnalysisInput,
  type EmployeeCrossAnalysisResult,
  type MonthlyOvertimeInput,
  type MonthlyWorkLogInput,
} from './cross-analysis'

/** PostgREST（ローカル・本番とも）のデフォルト1リクエストあたり最大行数 */
const POSTGREST_MAX_ROWS = 1000

/**
 * PostgRESTの1000行上限を超える結果セットを `.range()` によるページネーションで
 * 全件取得するヘルパー（task-management/queries.ts と同じパターン。ドメイン間の
 * 共有ユーティリティ化はしない既存踏襲）。
 */
async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  for (;;) {
    const to = from + POSTGREST_MAX_ROWS - 1
    const { data, error } = await fetchPage(from, to)
    if (error) throw error

    const rows = data ?? []
    allRows.push(...rows)

    if (rows.length < POSTGREST_MAX_ROWS) break
    from += POSTGREST_MAX_ROWS
  }

  return allRows
}

interface EmployeeRow {
  id: string
  name: string | null
  division_id: string | null
}

/**
 * 部門フィルタを適用する（純粋関数）。子孫部門を含める規約は collectDivisionAndDescendantIds
 * に集約されている（division-tree.ts のコメント参照）。
 */
function filterEmployeesByDivision(
  employees: EmployeeRow[],
  divisions: DivisionOption[],
  divisionId: string | undefined
): EmployeeRow[] {
  if (!divisionId) return employees
  if (divisionId === 'unassigned') return employees.filter(e => e.division_id === null)

  const allowedIds = collectDivisionAndDescendantIds(divisionId, divisions)
  return employees.filter(e => e.division_id !== null && allowedIds.has(e.division_id))
}

export interface WorkloadOvertimeCrossOptions {
  divisionId?: string
}

/**
 * 残業実績（monthly_employee_overtime）とタスク工数記録（task_work_logs）を
 * 従業員×月単位で突き合わせ、クロス分析結果を返す。
 *
 * divisionId でフィルタしても、タスク集中フラグの「部門内の他メンバー平均」は
 * 常にフィルタ後の対象従業員と同じ部門の同僚から算出される（フィルタが親組織で
 * あっても、同一 division_id の同僚は必ずフィルタ後の集合に含まれるため破綻しない）。
 */
export async function getWorkloadOvertimeCrossData(
  supabase: SupabaseClient<Database>,
  options: WorkloadOvertimeCrossOptions = {}
): Promise<EmployeeCrossAnalysisResult[]> {
  const [thresholds, allEmployees, divisions] = await Promise.all([
    getOvertimeThresholds(supabase),
    fetchAllRows<EmployeeRow>(async (from, to) => {
      const result = await supabase
        .from('employees')
        .select('id, name, division_id')
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    }),
    getTenantDivisions(supabase),
  ])

  const employees = filterEmployeesByDivision(allEmployees, divisions, options.divisionId)
  if (employees.length === 0) return []

  const yearMonths = buildRecentYearMonths(ANALYSIS_WINDOW_MONTHS, toJSTDateString())
  const earliestDate = `${yearMonths[0]}-01`
  const employeeIds = employees.map(e => e.id)
  const divisionNameById = new Map(divisions.map(d => [d.id, d.name]))

  const [overtimeRows, workLogRows] = await Promise.all([
    fetchAllRows<{
      employee_id: string
      year_month: string
      total_overtime_hours: number | null
      updated_at: string
    }>(async (from, to) => {
      const result = await supabase
        .from('monthly_employee_overtime')
        .select('employee_id, year_month, total_overtime_hours, updated_at')
        .gte('year_month', earliestDate)
        .in('employee_id', employeeIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    }),
    fetchAllRows<{ employee_id: string; work_date: string; hours: number }>(async (from, to) => {
      const result = await supabase
        .from('task_work_logs')
        .select('employee_id, work_date, hours')
        .gte('work_date', earliestDate)
        .in('employee_id', employeeIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    }),
  ])

  // 同一従業員×月に複数行（複数回の締め処理等）ある場合は updated_at 最新優先でマージする
  // （既存 getEmployeeOvertimeHistory と同じ規約。合算すると二重計上になるため）
  const overtimeByEmployee = new Map<string, Map<string, { hours: number; updatedAt: string }>>()
  for (const row of overtimeRows) {
    const ym = row.year_month.slice(0, 7)
    const byMonth = overtimeByEmployee.get(row.employee_id) ?? new Map()
    const existing = byMonth.get(ym)
    if (!existing || row.updated_at > existing.updatedAt) {
      byMonth.set(ym, { hours: Number(row.total_overtime_hours ?? 0), updatedAt: row.updated_at })
    }
    overtimeByEmployee.set(row.employee_id, byMonth)
  }

  const workLogByEmployee = new Map<string, Map<string, number>>()
  for (const row of workLogRows) {
    const ym = row.work_date.slice(0, 7)
    const byMonth = workLogByEmployee.get(row.employee_id) ?? new Map<string, number>()
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + Number(row.hours))
    workLogByEmployee.set(row.employee_id, byMonth)
  }

  const latestYm = yearMonths[yearMonths.length - 1]
  const latestLoggedHoursByEmployee = new Map<string, number>()
  for (const emp of employees) {
    const hours = workLogByEmployee.get(emp.id)?.get(latestYm) ?? 0
    latestLoggedHoursByEmployee.set(emp.id, hours)
  }

  function averageOfOtherMembers(divisionId: string | null, excludeEmployeeId: string): number {
    const peers = employees.filter(e => e.division_id === divisionId && e.id !== excludeEmployeeId)
    if (peers.length === 0) return 0
    const sum = peers.reduce((acc, e) => acc + (latestLoggedHoursByEmployee.get(e.id) ?? 0), 0)
    return sum / peers.length
  }

  return employees.map(emp => {
    const overtimeMonths: MonthlyOvertimeInput[] = yearMonths.map(ym => ({
      yearMonth: ym,
      overtimeHours: overtimeByEmployee.get(emp.id)?.get(ym)?.hours ?? 0,
    }))
    const workLogMonths: MonthlyWorkLogInput[] = yearMonths.map(ym => {
      const byMonth = workLogByEmployee.get(emp.id)
      return {
        yearMonth: ym,
        loggedHours: byMonth?.get(ym) ?? 0,
        hasAnyLog: byMonth?.has(ym) ?? false,
      }
    })

    const input: EmployeeCrossAnalysisInput = {
      employeeId: emp.id,
      employeeName: emp.name ?? '（名前未設定）',
      divisionId: emp.division_id,
      divisionName: emp.division_id ? (divisionNameById.get(emp.division_id) ?? null) : null,
      overtimeMonths,
      workLogMonths,
    }

    const divisionAverage = averageOfOtherMembers(emp.division_id, emp.id)
    return computeEmployeeCrossAnalysis(input, thresholds, divisionAverage)
  })
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: ローカルSupabaseで動作確認する**

`supabase start` でローカル環境が起動していることを確認した上で、以下のスクリプトで動作確認する（`tsx`で直接実行）：

```typescript
// 動作確認用の一時スクリプト（コミット不要、確認後に削除してよい）
import { createClient } from '@supabase/supabase-js'
import { getWorkloadOvertimeCrossData } from './src/features/workload-analysis/queries'

const supabase = createClient(
  'http://127.0.0.1:55421',
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ローカル確認用。RLSの挙動を見たい場合はanon keyを使う
)

getWorkloadOvertimeCrossData(supabase as any).then(result => {
  console.log(JSON.stringify(result.slice(0, 3), null, 2))
})
```

Expected: エラーなく従業員別の`EmployeeCrossAnalysisResult`配列が返る（`task_work_logs`の実データが少ないため`isAttentionNeeded: true`の件数は少なくてよい。3.1の継続的残業フラグのみでも動作すること自体を確認する）

- [ ] **Step 4: コミット**

```bash
git add src/features/workload-analysis/queries.ts
git commit -m "feat: 工数×残業クロス分析のクエリ関数（getWorkloadOvertimeCrossData）を追加"
```

---

### Task 4: 要注意サマリーカード（`AttentionSummaryCards.tsx`）と一覧テーブル（`EmployeeCrossAnalysisTable.tsx`）

**Files:**

- Create: `src/features/workload-analysis/components/admin/AttentionSummaryCards.tsx`
- Create: `src/features/workload-analysis/components/admin/EmployeeCrossAnalysisTable.tsx`

**Interfaces:**

- Consumes: `EmployeeCrossAnalysisResult`/`EmployeeCrossAnalysisFlags`（Task 1の`../../cross-analysis`）、`STATUS_LABELS`/`STATUS_BG_CLASSES`/`OvertimeStatus`（`@/utils/overtimeThresholds`）、`DataTable`/`Column`（`@/components/ui/DataTable`）
- Produces: `AttentionSummaryCards`コンポーネント（props: `{ results: EmployeeCrossAnalysisResult[] }`）、`EmployeeCrossAnalysisTable`コンポーネント（props: `{ results: EmployeeCrossAnalysisResult[] }`） — Task 6（`WorkloadOvertimeDashboard.tsx`）が使用する

このタスクはUIコンポーネントのためユニットテストは書かず、Task 6でダッシュボードに組み込んだ後の統合確認（ブラウザまたは静的検証）に委ねる（Task Health Dashboardの既存カード群と同じ設計判断）。

- [ ] **Step 1: `AttentionSummaryCards.tsx` を実装する**

```typescript
'use client'

import type { EmployeeCrossAnalysisResult } from '../../cross-analysis'

interface AttentionSummaryCardsProps {
  results: EmployeeCrossAnalysisResult[]
}

/** 要注意人数・分析対象人数・フラグ別内訳のKPIカード */
export function AttentionSummaryCards({ results }: AttentionSummaryCardsProps) {
  const attentionCount = results.filter(r => r.isAttentionNeeded).length
  const sustainedCount = results.filter(r => r.flags.sustainedOvertime).length
  const gapCount = results.filter(r => r.flags.underReportedGap).length
  const concentrationCount = results.filter(r => r.flags.workloadConcentration).length

  const cards: Array<{ label: string; value: number; accent: string }> = [
    { label: '要注意メンバー', value: attentionCount, accent: 'text-red-600' },
    { label: '分析対象人数', value: results.length, accent: 'text-slate-900' },
    { label: '継続的残業', value: sustainedCount, accent: 'text-amber-600' },
    { label: '申告乖離', value: gapCount, accent: 'text-orange-600' },
    { label: 'タスク集中', value: concentrationCount, accent: 'text-orange-600' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(card => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs text-slate-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${card.accent}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: `EmployeeCrossAnalysisTable.tsx` を実装する**

```typescript
'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import { STATUS_LABELS, STATUS_BG_CLASSES, type OvertimeStatus } from '@/utils/overtimeThresholds'
import type { EmployeeCrossAnalysisResult, EmployeeCrossAnalysisFlags } from '../../cross-analysis'

interface TableRow {
  employeeId: string
  employeeName: string
  divisionName: string
  latestOvertimeHours: number
  latestOvertimeStatus: OvertimeStatus
  latestLoggedHours: number
  latestGapRatio: number | null
  flags: EmployeeCrossAnalysisFlags
  isAttentionNeeded: boolean
}

function toTableRow(result: EmployeeCrossAnalysisResult): TableRow {
  const latest = result.months[result.months.length - 1] ?? null
  return {
    employeeId: result.employeeId,
    employeeName: result.employeeName,
    divisionName: result.divisionName ?? '未配属',
    latestOvertimeHours: latest?.overtimeHours ?? 0,
    latestOvertimeStatus: latest?.overtimeStatus ?? 'safe',
    latestLoggedHours: latest?.loggedHours ?? 0,
    latestGapRatio: latest?.gapRatio ?? null,
    flags: result.flags,
    isAttentionNeeded: result.isAttentionNeeded,
  }
}

const FLAG_LABEL: Record<keyof EmployeeCrossAnalysisFlags, string> = {
  sustainedOvertime: '継続的残業',
  underReportedGap: '申告乖離',
  workloadConcentration: 'タスク集中',
}

function FlagBadges({ flags }: { flags: EmployeeCrossAnalysisFlags }) {
  const active = (Object.keys(flags) as Array<keyof EmployeeCrossAnalysisFlags>).filter(
    key => flags[key]
  )
  if (active.length === 0) return <span className="text-xs text-slate-400">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {active.map(key => (
        <span
          key={key}
          className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
        >
          {FLAG_LABEL[key]}
        </span>
      ))}
    </div>
  )
}

const columns: Column<TableRow>[] = [
  { key: 'employeeName', label: '氏名', sortable: true },
  { key: 'divisionName', label: '部門', sortable: true },
  {
    key: 'latestOvertimeStatus',
    label: '直近月残業',
    render: (value: OvertimeStatus, item: TableRow) => (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BG_CLASSES[value]}`}>
        {item.latestOvertimeHours}h（{STATUS_LABELS[value]}）
      </span>
    ),
  },
  {
    key: 'latestLoggedHours',
    label: '直近月申告工数',
    render: (value: number) => `${value}h`,
  },
  {
    key: 'latestGapRatio',
    label: '乖離率',
    render: (value: number | null) => (value === null ? 'データ不足' : `${Math.round(value * 100)}%`),
  },
  {
    key: 'flags',
    label: '該当フラグ',
    render: (value: EmployeeCrossAnalysisFlags) => <FlagBadges flags={value} />,
  },
]

interface EmployeeCrossAnalysisTableProps {
  results: EmployeeCrossAnalysisResult[]
}

/** 従業員別の残業×工数クロス分析一覧（要注意メンバーを先頭にソート） */
export function EmployeeCrossAnalysisTable({ results }: EmployeeCrossAnalysisTableProps) {
  const rows = [...results]
    .sort((a, b) => Number(b.isAttentionNeeded) - Number(a.isAttentionNeeded))
    .map(toTableRow)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">従業員別クロス分析（{rows.length}名）</h2>
      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">分析対象の従業員がいません。</p>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            getRowId={r => r.employeeId}
            searchable
            searchKey="employeeName"
            searchPlaceholder="氏名で検索..."
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/workload-analysis/components/admin/AttentionSummaryCards.tsx src/features/workload-analysis/components/admin/EmployeeCrossAnalysisTable.tsx
git commit -m "feat: 工数×残業クロス分析のサマリーカードと一覧テーブルを追加"
```

---

### Task 5: 個人比較チャート（`OvertimeVsWorkloadChart.tsx`）

**Files:**

- Create: `src/features/workload-analysis/components/admin/OvertimeVsWorkloadChart.tsx`

**Interfaces:**

- Consumes: `EmployeeCrossAnalysisResult`（Task 1の`../../cross-analysis`）、Recharts（`CartesianGrid`/`Legend`/`Line`/`LineChart`/`ReferenceLine`/`ResponsiveContainer`/`Tooltip`/`XAxis`/`YAxis`）
- Produces: `OvertimeVsWorkloadChart`コンポーネント（props: `{ results: EmployeeCrossAnalysisResult[] }`） — Task 6（`WorkloadOvertimeDashboard.tsx`）が使用する

**注意**：既存の`36analysis/_components/OvertimeTrendChart.tsx`はSWR+APIルート（`/app/api/analysis/trend`）からデータ取得する古いパターンだが、これはCLAUDE.mdの「page.tsx → queries.ts → Client Componentにpropsで渡す」という現行の必須パターンに反する。本タスクではRechartsの描画方法のみを参考にし、データ取得方式は踏襲しない（props経由でデータを受け取る）。

- [ ] **Step 1: 実装する**

```typescript
'use client'

import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EmployeeCrossAnalysisResult } from '../../cross-analysis'

interface OvertimeVsWorkloadChartProps {
  results: EmployeeCrossAnalysisResult[]
}

/** 従業員を1名選択し、月別の残業時間と申告工数を比較する折れ線グラフ */
export function OvertimeVsWorkloadChart({ results }: OvertimeVsWorkloadChartProps) {
  const initialId = results.find(r => r.isAttentionNeeded)?.employeeId ?? results[0]?.employeeId ?? ''
  const [selectedId, setSelectedId] = useState(initialId)
  const selected = results.find(r => r.employeeId === selectedId) ?? null

  const chartData = (selected?.months ?? []).map(m => ({
    ym: m.yearMonth,
    overtimeHours: m.overtimeHours,
    loggedHours: m.hasAnyLog ? m.loggedHours : null,
  }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">残業時間 × 申告工数（個人比較）</h2>
        {results.length > 0 && (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            {results.map(r => (
              <option key={r.employeeId} value={r.employeeId}>
                {r.employeeName}
                {r.isAttentionNeeded ? '（要注意）' : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      {!selected || chartData.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">表示できるデータがありません。</p>
      ) : (
        <div className="mt-3 h-72 w-full min-w-0 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip
                formatter={(value: number | null, name: string) => [
                  value === null ? 'データなし' : `${value}h`,
                  name === 'overtimeHours' ? '残業時間' : '申告工数',
                ]}
              />
              <Legend formatter={value => (value === 'overtimeHours' ? '残業時間' : '申告工数')} />
              <ReferenceLine
                y={40}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: '40h', fill: '#b45309', fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="overtimeHours"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="overtimeHours"
              />
              <Line
                type="monotone"
                dataKey="loggedHours"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="loggedHours"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/workload-analysis/components/admin/OvertimeVsWorkloadChart.tsx
git commit -m "feat: 工数×残業クロス分析の個人比較チャートを追加"
```

---

### Task 6: ダッシュボードコンテナ（`WorkloadOvertimeDashboard.tsx`）

**Files:**

- Create: `src/features/workload-analysis/components/admin/WorkloadOvertimeDashboard.tsx`

**Interfaces:**

- Consumes: `AttentionSummaryCards`（Task 4）、`EmployeeCrossAnalysisTable`（Task 4）、`OvertimeVsWorkloadChart`（Task 5）、`EmployeeCrossAnalysisResult`（Task 1）、`DivisionOption`（`@/features/task-management/queries`）
- Produces: `WorkloadOvertimeDashboard`コンポーネント（props: `{ results: EmployeeCrossAnalysisResult[]; divisions: DivisionOption[]; selectedDivisionId: string | null }`） — Task 7（`page.tsx`）が使用する

- [ ] **Step 1: 実装する**

```typescript
'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AttentionSummaryCards } from './AttentionSummaryCards'
import { EmployeeCrossAnalysisTable } from './EmployeeCrossAnalysisTable'
import { OvertimeVsWorkloadChart } from './OvertimeVsWorkloadChart'
import type { EmployeeCrossAnalysisResult } from '../../cross-analysis'
import type { DivisionOption } from '@/features/task-management/queries'

interface WorkloadOvertimeDashboardProps {
  results: EmployeeCrossAnalysisResult[]
  divisions: DivisionOption[]
  selectedDivisionId: string | null
}

/** 工数×残業クロス分析ダッシュボードの部門フィルタ + サマリー・チャート・一覧の並び */
export function WorkloadOvertimeDashboard({
  results,
  divisions,
  selectedDivisionId,
}: WorkloadOvertimeDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete('division')
    } else {
      params.set('division', value)
    }
    // クエリが空になった場合は末尾の裸の「?」が残らないようパスのみに遷移する
    const queryString = params.toString()
    const href = queryString ? `${pathname}?${queryString}` : pathname
    startTransition(() => router.push(href))
  }

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">工数×残業クロス分析</h1>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          部門
          <select
            value={selectedDivisionId ?? ''}
            onChange={e => handleDivisionChange(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs disabled:opacity-60"
          >
            <option value="">全社</option>
            <option value="unassigned">未配属</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {isPending && <span className="text-xs text-slate-400">更新中...</span>}
        </label>
      </div>

      <AttentionSummaryCards results={results} />
      <OvertimeVsWorkloadChart results={results} />
      <EmployeeCrossAnalysisTable results={results} />
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/workload-analysis/components/admin/WorkloadOvertimeDashboard.tsx
git commit -m "feat: 工数×残業クロス分析ダッシュボードのコンテナコンポーネントを追加"
```

---

### Task 7: ページ（`page.tsx`/`loading.tsx`/`error.tsx`）

**Files:**

- Create: `src/app/(tenant)/(tenant-admin)/adm/(workload_analysis)/workload-burnout-analysis/page.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(workload_analysis)/workload-burnout-analysis/loading.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(workload_analysis)/workload-burnout-analysis/error.tsx`

**Interfaces:**

- Consumes: `getServerUser`（`@/lib/auth/server-user`）、`createClient`（`@/lib/supabase/server`）、`APP_ROUTES`（Task 2）、`isTenantAdmin`（`@/features/task-management/permissions`）、`getTenantDivisions`（`@/features/task-management/queries`）、`getWorkloadOvertimeCrossData`（Task 3）、`WorkloadOvertimeDashboard`（Task 6）

- [ ] **Step 1: `page.tsx` を実装する**

```typescript
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { isTenantAdmin } from '@/features/task-management/permissions'
import { getTenantDivisions } from '@/features/task-management/queries'
import { getWorkloadOvertimeCrossData } from '@/features/workload-analysis/queries'
import { WorkloadOvertimeDashboard } from '@/features/workload-analysis/components/admin/WorkloadOvertimeDashboard'

export const metadata = { title: '工数×残業クロス分析' }

interface WorkloadBurnoutAnalysisPageProps {
  searchParams: Promise<{ division?: string }>
}

export default async function WorkloadBurnoutAnalysisPage({
  searchParams,
}: WorkloadBurnoutAnalysisPageProps) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  // 管理者以外は共通レイアウト（(tenant-admin)/layout.tsx）と同じ /top へ戻す。
  // 管理者専用ルート（/adm）へ飛ばすと、そこで再度リダイレクトされ二重遷移になる。
  if (!isTenantAdmin(user.appRole)) redirect(APP_ROUTES.TENANT.PORTAL)

  const { division } = await searchParams
  const divisionId = division && division.length > 0 ? division : undefined

  const supabase = await createClient()

  const [results, divisions] = await Promise.all([
    getWorkloadOvertimeCrossData(supabase, { divisionId }),
    getTenantDivisions(supabase),
  ])

  return (
    <WorkloadOvertimeDashboard
      results={results}
      divisions={divisions}
      selectedDivisionId={divisionId ?? null}
    />
  )
}
```

- [ ] **Step 2: `loading.tsx` を実装する**

```typescript
export default function Loading() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-300" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-300" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `error.tsx` を実装する**

```typescript
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/workload-burnout-analysis — 工数×残業クロス分析
        </div>
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <p className="text-sm font-medium text-gray-700">データの読み込みに失敗しました</p>
          <p className="text-xs text-gray-400">{error.message}</p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              再試行
            </button>
            <Link
              href={APP_ROUTES.TENANT.ADMIN}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              管理トップへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 型チェックとビルドを実行する**

Run: `npm run type-check && npm run build`
Expected: エラーなし（`/adm/workload-burnout-analysis` がビルド出力のルート一覧に現れる）

- [ ] **Step 5: コミット**

```bash
git add "src/app/(tenant)/(tenant-admin)/adm/(workload_analysis)/workload-burnout-analysis/"
git commit -m "feat: 工数×残業クロス分析ダッシュボードのページを追加"
```

---

### Task 8: メニュー登録マイグレーション

**Files:**

- Create: `supabase/migrations/20260912170000_workload_overtime_cross_analysis_menu.sql`

**Interfaces:**

- Consumes: 既存テーブル `service_category`（`name = '勤務：分析'`で解決）、`service`、`tenant_service`、`tenants`
- Produces: なし（マスタデータ投入のみ）

- [ ] **Step 1: マイグレーションSQLを作成する**

```sql
-- =============================================================================
-- 工数×残業クロス分析ダッシュボード（テナント管理者向け、/adm/workload-burnout-analysis）
-- のメニュー登録
--
-- 既存カテゴリ「勤務：分析」（36協定分析と同じカテゴリ、service_category.name で解決）
-- にサービスを追加する。新規カテゴリは作らない（PRD セクション7）。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。task_health_dashboard_menu マイグレーションの
-- 実装知見に合わせる）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するレコードのid（環境間で揃える。python3 -c "import uuid; print(uuid.uuid4())" で生成した値）
  v_service_id CONSTANT uuid := '6cd54bce-3d45-4ff6-99c5-0eb7d5866858';

  v_category_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- 既存カテゴリ「勤務：分析」を解決する ----
  SELECT id INTO v_category_id
  FROM public.service_category
  WHERE name = '勤務：分析'
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION '[workload_overtime_cross_analysis] 既存カテゴリ「勤務：分析」を解決できませんでした。マイグレーションを中断します。';
  END IF;

  -- ---- サービス本体を登録する ----
  INSERT INTO public.service (
    id, service_category_id, name, category, title, description,
    sort_order, route_path, app_role_group_id, app_role_group_uuid,
    target_audience, release_status
  ) VALUES (
    v_service_id,
    v_category_id,
    '工数×残業クロス分析',
    NULL,
    '工数×残業クロス分析',
    '残業時間と申告工数を従業員×月単位で突き合わせ、継続的残業・申告乖離・タスク時間集中を検知して要注意メンバーを一覧表示します。',
    55,
    '/adm/workload-burnout-analysis',
    NULL,
    NULL,
    'adm',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---- 既存全テナントに機能を有効化する ----
  -- start_date/status は task_health_dashboard_menu マイグレーションでの実データ調査結果と
  -- 同じ理由でNULLのまま入れる（tenant_serviceに行が存在すること自体が「有効」を意味する）。
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_service_id
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_service_id
  );
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  RAISE NOTICE '[workload_overtime_cross_analysis] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
END $$;
```

- [ ] **Step 2: ローカルSupabaseに適用する**

Run: `supabase migration up`
Expected: エラーなく適用される。`NOTICE`でテナント割り当て件数が出力される

- [ ] **Step 3: 適用結果を確認する**

Run: `psql postgresql://127.0.0.1:55422/postgres -c "SELECT s.title, s.route_path, sc.name AS category, count(ts.tenant_id) AS tenant_count FROM public.service s JOIN public.service_category sc ON sc.id = s.service_category_id LEFT JOIN public.tenant_service ts ON ts.service_id = s.id WHERE s.route_path = '/adm/workload-burnout-analysis' GROUP BY s.title, s.route_path, sc.name;"`
Expected: 1行返り、`category`が「勤務：分析」、`tenant_count`が既存テナント数と一致する

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260912170000_workload_overtime_cross_analysis_menu.sql
git commit -m "feat: 工数×残業クロス分析ダッシュボードのメニュー登録マイグレーションを追加"
```

---

## 完了後のドキュメント更新

全タスク完了後、`docs/implementation-plan-workload-overtime-cross-analysis.md` の末尾に「実装ステータス」章を追加し、全タスク完了・ブランチ名・実施方式を記録すること（`implementation-plan-task-management.md` 21.7と同じ形式）。

# P2-A 離職予兆スコアリング & アラート 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の勤怠・ストレスチェック・パルスサーベイ・アンケートデータを横断して複合リスクスコアを算出し、ハイリスク従業員を一覧・アラートで把握できるテナント管理者向けダッシュボードを実装する。

**Architecture:** 新テーブル `turnover_risk_scores`（スコアスナップショット保存）と `turnover_risk_action_logs`（アクション記録）を追加。スコア計算はサーバーサイド Server Action で実行し、結果をテーブルに保存する。UI は `src/features/turnover-risk/` を新設し、`/adm/turnover-risk` ルートに配置する。既存データ（employees, work_time_records, stress_check_results, survey_response_aggregates, questionnaire_responses 等）は **読み取り専用** で参照し、一切変更しない。

**Tech Stack:** Next.js 16 App Router, TypeScript 5 (strict: false), Supabase PostgreSQL + RLS, Tailwind CSS v4, Zod v4, Recharts, Server Actions

---

## ⚠️ 絶対禁止事項

- `supabase db reset` の実行（既存データ消滅）
- マイグレーションでの `DROP TABLE` / `TRUNCATE` / `DELETE FROM` の既存テーブルへの実行
- エンドユーザー向け `actions.ts` での `createAdminClient()` 使用
- URL のハードコード（必ず `APP_ROUTES` を使用）
- `npx supabase` の使用（グローバル `supabase` コマンドを使用）

---

## スコアリングロジック設計

複合リスクスコアは 0〜100 点で表し、以下 4 因子の重み付き合計で算出する。

| 因子 | 最大寄与点 | データソース | 閾値 |
|---|---|---|---|
| ストレスチェック高ストレス | 35 pt | `stress_check_results.is_high_stress` | 高ストレス → 35pt |
| パルスサーベイ低スコア | 30 pt | `survey_response_aggregates` or `echo_responses` | 最新スコア < 3.0（5点満点） → 30pt、< 4.0 → 15pt |
| 残業急増・長時間残業 | 20 pt | `work_time_records` 月次集計 | 前月比 +20h 以上 → 20pt、80h超え → 20pt、45h超え → 10pt |
| アンケート未回答増加 | 15 pt | `questionnaire_responses` vs 配布数 | 直近2回以上未回答 → 15pt、1回未回答 → 7pt |

リスクレベル判定：
- **high** : 60 点以上
- **medium** : 30〜59 点
- **low** : 0〜29 点

---

## ファイル構成

### 新規作成ファイル

```
supabase/migrations/
  20260604000000_add_turnover_risk_tables.sql   # 新テーブル + RLS

src/features/turnover-risk/
  types.ts                                       # 型定義
  queries.ts                                     # SELECT のみ（スコア取得・一覧）
  score-calculator.ts                            # スコア計算ロジック（pure function）
  actions.ts                                     # Server Actions（スコア再計算・アクションログ）
  components/
    TurnoverRiskDashboard.tsx                    # メインダッシュボード（Client Component）
    RiskRankingTable.tsx                         # リスクランキングテーブル
    RiskFactorBreakdown.tsx                      # 因子内訳パネル（スライドアウト or 展開）
    ActionLogModal.tsx                           # アクションログ記録モーダル
    RiskLevelBadge.tsx                           # high/medium/low バッジ
    RecalculateButton.tsx                        # スコア再計算ボタン

src/app/(tenant)/(colored)/adm/(turnover_risk)/
  turnover-risk/
    page.tsx                                     # Server Component
    loading.tsx                                  # ローディング
    error.tsx                                    # エラー境界
```

### 変更ファイル

```
src/config/routes.ts                             # ADMIN_TURNOVER_RISK 追加
```

---

## Task 1: データベースマイグレーション

**Files:**
- Create: `supabase/migrations/20260604000000_add_turnover_risk_tables.sql`

- [ ] **Step 1: マイグレーションファイルを作成する**

```bash
supabase migration new add_turnover_risk_tables
```

生成されたファイル（タイムスタンプ付きファイル名）を確認し、以下 SQL を書き込む。

- [ ] **Step 2: SQL を記述する**

生成されたマイグレーションファイルに以下を記述：

```sql
-- 離職リスクスコアスナップショット
-- 既存テーブルは一切変更しない。このファイルは新規テーブルの追加のみ。
CREATE TABLE public.turnover_risk_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  risk_score      INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level      TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
  -- 因子別内訳（JSONB）
  -- { stress_score: 35, survey_score: 30, overtime_score: 20, absence_score: 15, details: {...} }
  score_factors   JSONB NOT NULL DEFAULT '{}',
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_scores
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_turnover_risk_tenant_emp
  ON public.turnover_risk_scores(tenant_id, employee_id, calculated_at DESC);

CREATE INDEX idx_turnover_risk_level
  ON public.turnover_risk_scores(tenant_id, risk_level, calculated_at DESC);

-- ハイリスク者へのアクションログ
CREATE TABLE public.turnover_risk_action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  logged_by   UUID NOT NULL REFERENCES public.employees(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'one_on_one',     -- 1on1 実施
    'counseling',     -- カウンセリング
    'manager_talk',   -- 上長面談
    'hr_interview',   -- 人事面談
    'other'           -- その他
  )),
  notes       TEXT,
  actioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_action_logs
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_turnover_action_employee
  ON public.turnover_risk_action_logs(tenant_id, employee_id, actioned_at DESC);
```

- [ ] **Step 3: マイグレーションを適用する（ローカル）**

```bash
supabase migration up
```

期待される出力：
```
Applying migration 20260604000000_add_turnover_risk_tables.sql... ok
```

- [ ] **Step 4: テーブルが作成されたか確認する**

Supabase Studio（http://127.0.0.1:55423）で `turnover_risk_scores` と `turnover_risk_action_logs` が存在することを確認する。

- [ ] **Step 5: コミットする**

```bash
git add supabase/migrations/
git commit -m "feat: add turnover_risk_scores and action_logs tables with RLS"
```

---

## Task 2: 型定義

**Files:**
- Create: `src/features/turnover-risk/types.ts`

- [ ] **Step 1: 型定義ファイルを作成する**

```typescript
// src/features/turnover-risk/types.ts

export type RiskLevel = 'high' | 'medium' | 'low'

export type ActionType =
  | 'one_on_one'
  | 'counseling'
  | 'manager_talk'
  | 'hr_interview'
  | 'other'

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  one_on_one: '1on1 実施',
  counseling: 'カウンセリング',
  manager_talk: '上長面談',
  hr_interview: '人事面談',
  other: 'その他',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

// スコア因子の内訳
export interface ScoreFactors {
  stress_score: number        // 0 or 35
  survey_score: number        // 0, 15, or 30
  overtime_score: number      // 0, 10, or 20
  absence_score: number       // 0, 7, or 15
  details: {
    is_high_stress: boolean
    latest_survey_score: number | null
    overtime_hours_last_month: number
    overtime_delta_hours: number    // 前月比増減
    unanswered_questionnaire_count: number
  }
}

// DB から取得したリスクスコア行
export interface TurnoverRiskScore {
  id: string
  employee_id: string
  risk_score: number
  risk_level: RiskLevel
  score_factors: ScoreFactors
  calculated_at: string
}

// 一覧表示用（従業員情報と結合）
export interface TurnoverRiskRow {
  employee_id: string
  employee_name: string
  department_name: string | null
  risk_score: number
  risk_level: RiskLevel
  score_factors: ScoreFactors
  calculated_at: string
  latest_action_at: string | null
  latest_action_type: ActionType | null
}

// アクションログ行
export interface ActionLog {
  id: string
  employee_id: string
  logged_by: string
  action_type: ActionType
  notes: string | null
  actioned_at: string
}

// ダッシュボード用集計データ
export interface TurnoverRiskSummary {
  highCount: number
  mediumCount: number
  lowCount: number
  totalCount: number
  lastCalculatedAt: string | null
}

// スコア計算の入力データ（pure function 用）
export interface EmployeeRawData {
  employee_id: string
  is_high_stress: boolean
  latest_survey_score: number | null    // 0-5 スケール
  overtime_hours_last_month: number     // 先月の残業時間合計
  overtime_hours_two_months_ago: number // 先々月の残業時間合計
  unanswered_questionnaire_count: number // 直近3回のアンケート未回答数
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/types.ts
git commit -m "feat: add turnover-risk types"
```

---

## Task 3: スコア計算ロジック（pure function）

**Files:**
- Create: `src/features/turnover-risk/score-calculator.ts`

- [ ] **Step 1: スコア計算ファイルを作成する**

```typescript
// src/features/turnover-risk/score-calculator.ts
import type { EmployeeRawData, ScoreFactors, RiskLevel } from './types'

/** ストレスチェック因子: 高ストレス → 35pt */
function calcStressScore(isHighStress: boolean): number {
  return isHighStress ? 35 : 0
}

/**
 * パルスサーベイ因子
 * スコアは 0-5 スケール（DBの1-10を÷2したもの）
 * < 3.0 → 30pt, < 4.0 → 15pt, else → 0
 */
function calcSurveyScore(latestSurveyScore: number | null): number {
  if (latestSurveyScore === null) return 0
  if (latestSurveyScore < 3.0) return 30
  if (latestSurveyScore < 4.0) return 15
  return 0
}

/**
 * 残業因子
 * 前月比 +20h 以上 OR 月80h超 → 20pt
 * 月45h超 → 10pt
 */
function calcOvertimeScore(
  overtimeHoursLastMonth: number,
  overtimeHoursTwoMonthsAgo: number
): number {
  const delta = overtimeHoursLastMonth - overtimeHoursTwoMonthsAgo
  if (overtimeHoursLastMonth > 80 || delta >= 20) return 20
  if (overtimeHoursLastMonth > 45) return 10
  return 0
}

/**
 * アンケート未回答因子
 * 直近3回中2回以上未回答 → 15pt, 1回未回答 → 7pt
 */
function calcAbsenceScore(unansweredCount: number): number {
  if (unansweredCount >= 2) return 15
  if (unansweredCount === 1) return 7
  return 0
}

/** リスクレベル判定 */
function calcRiskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

/** 従業員1人分のリスクスコアを計算する */
export function calculateRiskScore(data: EmployeeRawData): {
  risk_score: number
  risk_level: RiskLevel
  score_factors: ScoreFactors
} {
  const stress_score = calcStressScore(data.is_high_stress)
  const survey_score = calcSurveyScore(data.latest_survey_score)
  const overtime_score = calcOvertimeScore(
    data.overtime_hours_last_month,
    data.overtime_hours_two_months_ago
  )
  const absence_score = calcAbsenceScore(data.unanswered_questionnaire_count)

  const risk_score = stress_score + survey_score + overtime_score + absence_score

  return {
    risk_score,
    risk_level: calcRiskLevel(risk_score),
    score_factors: {
      stress_score,
      survey_score,
      overtime_score,
      absence_score,
      details: {
        is_high_stress: data.is_high_stress,
        latest_survey_score: data.latest_survey_score,
        overtime_hours_last_month: data.overtime_hours_last_month,
        overtime_delta_hours:
          data.overtime_hours_last_month - data.overtime_hours_two_months_ago,
        unanswered_questionnaire_count: data.unanswered_questionnaire_count,
      },
    },
  }
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/score-calculator.ts
git commit -m "feat: add turnover risk score calculator (pure function)"
```

---

## Task 4: クエリ（読み取り専用）

**Files:**
- Create: `src/features/turnover-risk/queries.ts`

- [ ] **Step 1: queries.ts を作成する**

```typescript
// src/features/turnover-risk/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  TurnoverRiskRow,
  TurnoverRiskSummary,
  ActionLog,
  EmployeeRawData,
  ActionType,
} from './types'

/** 最新リスクスコア一覧（従業員情報付き）を取得する */
export async function getTurnoverRiskRows(): Promise<TurnoverRiskRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  // 各従業員の最新スコアのみを取得（calculated_at DESC でソートし JS 側で重複除去）
  const { data: scores, error: scoresError } = await supabase
    .from('turnover_risk_scores')
    .select('employee_id, risk_score, risk_level, score_factors, calculated_at')
    .eq('tenant_id', user.tenant_id)
    .order('calculated_at', { ascending: false })
    .limit(500)

  if (scoresError || !scores) return []

  // 従業員ごとに最新スコアのみ残す
  const latestByEmployee = new Map<string, typeof scores[number]>()
  for (const s of scores) {
    if (!latestByEmployee.has(s.employee_id)) {
      latestByEmployee.set(s.employee_id, s)
    }
  }

  // 最新アクションログを取得する
  const { data: actions } = await supabase
    .from('turnover_risk_action_logs')
    .select('employee_id, action_type, actioned_at')
    .eq('tenant_id', user.tenant_id)
    .order('actioned_at', { ascending: false })
    .limit(500)

  const latestActionByEmployee = new Map<
    string,
    { action_type: string; actioned_at: string }
  >()
  for (const a of actions ?? []) {
    if (!latestActionByEmployee.has(a.employee_id)) {
      latestActionByEmployee.set(a.employee_id, a)
    }
  }

  // 従業員情報を取得する
  const employeeIds = Array.from(latestByEmployee.keys())
  if (employeeIds.length === 0) return []

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', employeeIds)
    .eq('tenant_id', user.tenant_id)

  if (empError || !employees) return []

  const empMap = new Map(employees.map((e) => [e.id, e]))

  const rows: TurnoverRiskRow[] = []
  for (const [empId, score] of latestByEmployee) {
    const emp = empMap.get(empId)
    if (!emp) continue
    const action = latestActionByEmployee.get(empId)
    const divisionData = emp.divisions as { name: string } | { name: string }[] | null
    const departmentName = Array.isArray(divisionData)
      ? divisionData[0]?.name ?? null
      : divisionData?.name ?? null
    rows.push({
      employee_id: empId,
      employee_name: emp.name ?? '',
      department_name: departmentName,
      risk_score: score.risk_score,
      risk_level: score.risk_level as 'high' | 'medium' | 'low',
      score_factors: score.score_factors as never,
      calculated_at: score.calculated_at,
      latest_action_at: action?.actioned_at ?? null,
      latest_action_type: (action?.action_type as ActionType) ?? null,
    })
  }

  // リスクスコア降順ソート
  return rows.sort((a, b) => b.risk_score - a.risk_score)
}

/** ダッシュボード集計サマリーを取得する */
export async function getTurnoverRiskSummary(): Promise<TurnoverRiskSummary> {
  const rows = await getTurnoverRiskRows()
  const highCount = rows.filter((r) => r.risk_level === 'high').length
  const mediumCount = rows.filter((r) => r.risk_level === 'medium').length
  const lowCount = rows.filter((r) => r.risk_level === 'low').length
  const lastCalculatedAt =
    rows.length > 0
      ? rows.reduce((latest, r) =>
          r.calculated_at > latest.calculated_at ? r : latest
        ).calculated_at
      : null

  return {
    highCount,
    mediumCount,
    lowCount,
    totalCount: rows.length,
    lastCalculatedAt,
  }
}

/** 特定従業員のアクションログを取得する */
export async function getActionLogs(employeeId: string): Promise<ActionLog[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('turnover_risk_action_logs')
    .select('id, employee_id, logged_by, action_type, notes, actioned_at')
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', employeeId)
    .order('actioned_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data as ActionLog[]
}

/**
 * スコア再計算に必要な生データを収集する
 * 既存テーブルを読み取り専用で参照する
 */
export async function collectEmployeeRawData(): Promise<EmployeeRawData[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  // JST 現在年月
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
  )
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const prevPrevMonth = prevMonth === 1 ? 12 : prevMonth - 1
  const prevPrevMonthYear = prevMonth === 1 ? prevMonthYear - 1 : prevMonthYear

  const pad = (n: number) => String(n).padStart(2, '0')
  const prevYm = `${prevMonthYear}-${pad(prevMonth)}`
  const prevPrevYm = `${prevPrevMonthYear}-${pad(prevPrevMonth)}`
  const prevMonthStart = `${prevYm}-01`
  const prevMonthEnd = new Date(prevMonthYear, prevMonth, 0)
    .toISOString()
    .split('T')[0]
  const prevPrevMonthStart = `${prevPrevYm}-01`
  const prevPrevMonthEnd = new Date(prevPrevMonthYear, prevPrevMonth, 0)
    .toISOString()
    .split('T')[0]

  // 1. アクティブ従業員一覧
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'active')

  if (!employees || employees.length === 0) return []
  const employeeIds = employees.map((e) => e.id)

  // 2. 最新ストレスチェック結果（is_high_stress）
  const { data: stressResults } = await supabase
    .from('stress_check_results')
    .select('employee_id, is_high_stress, answered_at')
    .in('employee_id', employeeIds)
    .order('answered_at', { ascending: false })
    .limit(employeeIds.length * 3)

  const latestStressByEmp = new Map<string, boolean>()
  for (const r of stressResults ?? []) {
    if (!latestStressByEmp.has(r.employee_id)) {
      latestStressByEmp.set(r.employee_id, r.is_high_stress ?? false)
    }
  }

  // 3. 先月・先々月の残業時間合計（work_time_records から実働時間を計算）
  //    残業 = max(実働時間 - 8h, 0) を日単位で合計
  const { data: prevWtr } = await supabase
    .from('work_time_records')
    .select('employee_id, start_time, end_time')
    .in('employee_id', employeeIds)
    .gte('record_date', prevMonthStart)
    .lte('record_date', prevMonthEnd)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)

  const { data: prevPrevWtr } = await supabase
    .from('work_time_records')
    .select('employee_id, start_time, end_time')
    .in('employee_id', employeeIds)
    .gte('record_date', prevPrevMonthStart)
    .lte('record_date', prevPrevMonthEnd)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)

  function calcOvertimeHours(
    records: { employee_id: string; start_time: string | null; end_time: string | null }[]
  ): Map<string, number> {
    const map = new Map<string, number>()
    for (const r of records) {
      if (!r.start_time || !r.end_time) continue
      const start = new Date(r.start_time)
      const end = new Date(r.end_time)
      const workHours = (end.getTime() - start.getTime()) / 3600000
      const ot = Math.max(workHours - 8, 0)
      map.set(r.employee_id, (map.get(r.employee_id) ?? 0) + ot)
    }
    return map
  }

  const prevOtMap = calcOvertimeHours(prevWtr ?? [])
  const prevPrevOtMap = calcOvertimeHours(prevPrevWtr ?? [])

  // 4. 最新パルスサーベイスコア
  //    survey_response_aggregates テーブルがある前提。なければ null 扱い（寄与 0）。
  const { data: surveyAggs } = await supabase
    .from('survey_response_aggregates')
    .select('employee_id, avg_score, period')
    .in('employee_id', employeeIds)
    .order('period', { ascending: false })
    .limit(employeeIds.length * 3)

  const latestSurveyByEmp = new Map<string, number>()
  for (const s of surveyAggs ?? []) {
    if (!latestSurveyByEmp.has(s.employee_id)) {
      // DBスコアは 1-10、÷2 で 0-5 スケールに変換
      latestSurveyByEmp.set(
        s.employee_id,
        Math.round((s.avg_score / 2) * 10) / 10
      )
    }
  }

  // 5. アンケート未回答数（直近3期のアサインに対して回答済みか）
  const { data: assignments } = await supabase
    .from('questionnaire_assignments')
    .select('employee_id, period_id')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })
    .limit(employeeIds.length * 3)

  const { data: responses } = await supabase
    .from('questionnaire_responses')
    .select('employee_id, period_id')
    .in('employee_id', employeeIds)

  const respondedSet = new Set<string>()
  for (const r of responses ?? []) {
    respondedSet.add(`${r.employee_id}:${r.period_id}`)
  }

  const assignmentsByEmp = new Map<string, string[]>()
  for (const a of assignments ?? []) {
    const arr = assignmentsByEmp.get(a.employee_id) ?? []
    if (arr.length < 3) arr.push(a.period_id)
    assignmentsByEmp.set(a.employee_id, arr)
  }

  const unansweredCountMap = new Map<string, number>()
  for (const [empId, periodIds] of assignmentsByEmp) {
    const unanswered = periodIds.filter(
      (pid) => !respondedSet.has(`${empId}:${pid}`)
    ).length
    unansweredCountMap.set(empId, unanswered)
  }

  // 全員分のデータを結合する
  return employeeIds.map((empId) => ({
    employee_id: empId,
    is_high_stress: latestStressByEmp.get(empId) ?? false,
    latest_survey_score: latestSurveyByEmp.get(empId) ?? null,
    overtime_hours_last_month: prevOtMap.get(empId) ?? 0,
    overtime_hours_two_months_ago: prevPrevOtMap.get(empId) ?? 0,
    unanswered_questionnaire_count: unansweredCountMap.get(empId) ?? 0,
  }))
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/queries.ts
git commit -m "feat: add turnover risk queries (read-only)"
```

---

## Task 5: Server Actions

**Files:**
- Create: `src/features/turnover-risk/actions.ts`

- [ ] **Step 1: actions.ts を作成する**

```typescript
// src/features/turnover-risk/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { calculateRiskScore } from './score-calculator'
import { collectEmployeeRawData } from './queries'
import { APP_ROUTES } from '@/config/routes'
import type { ActionType } from './types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/** 全従業員のリスクスコアを再計算して保存する */
export async function recalculateTurnoverRiskScores(): Promise<{
  success: boolean
  updatedCount: number
  error?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, updatedCount: 0, error: 'Unauthorized' }
  }

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    return { success: false, updatedCount: 0, error: 'Permission denied' }
  }

  try {
    const rawDataList = await collectEmployeeRawData()
    if (rawDataList.length === 0) {
      return { success: true, updatedCount: 0 }
    }

    const supabase = await createClient()
    const now = new Date().toISOString()

    const records = rawDataList.map((raw) => {
      const { risk_score, risk_level, score_factors } = calculateRiskScore(raw)
      return {
        tenant_id: user.tenant_id!,
        employee_id: raw.employee_id,
        risk_score,
        risk_level,
        score_factors,
        calculated_at: now,
      }
    })

    const { error } = await supabase
      .from('turnover_risk_scores')
      .insert(records)

    if (error) {
      return { success: false, updatedCount: 0, error: error.message }
    }

    revalidatePath(APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK)
    return { success: true, updatedCount: records.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, updatedCount: 0, error: message }
  }
}

const actionLogSchema = z.object({
  employeeId: z.string().uuid(),
  actionType: z.enum([
    'one_on_one',
    'counseling',
    'manager_talk',
    'hr_interview',
    'other',
  ]),
  notes: z.string().max(1000).optional(),
})

/** ハイリスク者へのアクションログを記録する */
export async function logTurnoverRiskAction(input: {
  employeeId: string
  actionType: ActionType
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = actionLogSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('turnover_risk_action_logs').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    logged_by: user.employee_id,
    action_type: parsed.data.actionType,
    notes: parsed.data.notes ?? null,
    actioned_at: new Date().toISOString(),
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK)
  return { success: true }
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/actions.ts
git commit -m "feat: add turnover risk server actions (recalculate + action log)"
```

---

## Task 6: APP_ROUTES に定数を追加する

**Files:**
- Modify: `src/config/routes.ts`

- [ ] **Step 1: routes.ts を編集して定数を追加する**

`src/config/routes.ts` の TENANT オブジェクト内、`ADMIN_HR_KPI: '/adm/hr-kpi',` の後に追加する：

```typescript
    /** 離職予兆スコアリング & アラート（P2-A） */
    ADMIN_TURNOVER_RISK: '/adm/turnover-risk',
```

- [ ] **Step 2: コミットする**

```bash
git add src/config/routes.ts
git commit -m "feat: add ADMIN_TURNOVER_RISK route constant"
```

---

## Task 7: UI コンポーネント — RiskLevelBadge

**Files:**
- Create: `src/features/turnover-risk/components/RiskLevelBadge.tsx`

- [ ] **Step 1: バッジコンポーネントを作成する**

```tsx
// src/features/turnover-risk/components/RiskLevelBadge.tsx
'use client'

import type { RiskLevel } from '../types'
import { RISK_LEVEL_LABELS } from '../types'

interface Props {
  level: RiskLevel
}

const COLOR_MAP: Record<RiskLevel, string> = {
  high: 'bg-red-100 text-red-700 ring-1 ring-red-300',
  medium: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300',
  low: 'bg-green-100 text-green-700 ring-1 ring-green-300',
}

export function RiskLevelBadge({ level }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_MAP[level]}`}
    >
      {RISK_LEVEL_LABELS[level]}
    </span>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/components/RiskLevelBadge.tsx
git commit -m "feat: add RiskLevelBadge component"
```

---

## Task 8: UI コンポーネント — RiskFactorBreakdown

**Files:**
- Create: `src/features/turnover-risk/components/RiskFactorBreakdown.tsx`

- [ ] **Step 1: 因子内訳パネルを作成する**

```tsx
// src/features/turnover-risk/components/RiskFactorBreakdown.tsx
'use client'

import type { ScoreFactors } from '../types'

interface Props {
  factors: ScoreFactors
}

interface FactorRow {
  label: string
  score: number
  maxScore: number
  detail: string
}

export function RiskFactorBreakdown({ factors }: Props) {
  const rows: FactorRow[] = [
    {
      label: 'ストレスチェック',
      score: factors.stress_score,
      maxScore: 35,
      detail: factors.details.is_high_stress ? '高ストレス判定あり' : '高ストレスなし',
    },
    {
      label: 'パルスサーベイ',
      score: factors.survey_score,
      maxScore: 30,
      detail:
        factors.details.latest_survey_score !== null
          ? `最新スコア ${factors.details.latest_survey_score.toFixed(1)} / 5.0`
          : '回答データなし',
    },
    {
      label: '残業・勤怠',
      score: factors.overtime_score,
      maxScore: 20,
      detail: `先月残業 ${factors.details.overtime_hours_last_month.toFixed(1)}h（前月比 ${
        factors.details.overtime_delta_hours >= 0 ? '+' : ''
      }${factors.details.overtime_delta_hours.toFixed(1)}h）`,
    },
    {
      label: 'アンケート未回答',
      score: factors.absence_score,
      maxScore: 15,
      detail: `直近3回中 ${factors.details.unanswered_questionnaire_count}回 未回答`,
    },
  ]

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        リスク因子内訳
      </p>
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-700">{row.label}</span>
            <span
              className={`font-semibold ${row.score > 0 ? 'text-red-600' : 'text-gray-400'}`}
            >
              {row.score} / {row.maxScore} pt
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                row.score === 0
                  ? 'bg-gray-300'
                  : row.score >= row.maxScore * 0.7
                  ? 'bg-red-400'
                  : 'bg-yellow-400'
              }`}
              style={{ width: `${(row.score / row.maxScore) * 100}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{row.detail}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/components/RiskFactorBreakdown.tsx
git commit -m "feat: add RiskFactorBreakdown component"
```

---

## Task 9: UI コンポーネント — ActionLogModal

**Files:**
- Create: `src/features/turnover-risk/components/ActionLogModal.tsx`

- [ ] **Step 1: アクションログモーダルを作成する**

```tsx
// src/features/turnover-risk/components/ActionLogModal.tsx
'use client'

import { useState } from 'react'
import { logTurnoverRiskAction } from '../actions'
import { ACTION_TYPE_LABELS } from '../types'
import type { ActionType } from '../types'

interface Props {
  employeeId: string
  employeeName: string
  isOpen: boolean
  onClose: () => void
}

const ACTION_TYPES: ActionType[] = [
  'one_on_one',
  'counseling',
  'manager_talk',
  'hr_interview',
  'other',
]

export function ActionLogModal({
  employeeId,
  employeeName,
  isOpen,
  onClose,
}: Props) {
  const [actionType, setActionType] = useState<ActionType>('one_on_one')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await logTurnoverRiskAction({ employeeId, actionType, notes })
    setIsSubmitting(false)

    if (result.success) {
      setNotes('')
      onClose()
    } else {
      setError(result.error ?? 'エラーが発生しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-200 bg-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">アクションを記録する</h2>
          <p className="mt-0.5 text-sm text-gray-600">{employeeName}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              アクション種別
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              メモ（任意）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="面談内容や次のアクションを記録してください"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {notes.length}/1000
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/components/ActionLogModal.tsx
git commit -m "feat: add ActionLogModal component"
```

---

## Task 10: UI コンポーネント — RecalculateButton

**Files:**
- Create: `src/features/turnover-risk/components/RecalculateButton.tsx`

- [ ] **Step 1: 再計算ボタンを作成する**

```tsx
// src/features/turnover-risk/components/RecalculateButton.tsx
'use client'

import { useState } from 'react'
import { recalculateTurnoverRiskScores } from '../actions'

export function RecalculateButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setMessage(null)
    const result = await recalculateTurnoverRiskScores()
    setIsLoading(false)
    if (result.success) {
      setMessage(`${result.updatedCount} 名のスコアを更新しました`)
    } else {
      setMessage(`エラー: ${result.error}`)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-gray-600">{message}</span>}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoading ? '計算中...' : 'スコア再計算'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/components/RecalculateButton.tsx
git commit -m "feat: add RecalculateButton component"
```

---

## Task 11: UI コンポーネント — RiskRankingTable

**Files:**
- Create: `src/features/turnover-risk/components/RiskRankingTable.tsx`

- [ ] **Step 1: ランキングテーブルを作成する**

```tsx
// src/features/turnover-risk/components/RiskRankingTable.tsx
'use client'

import { useState } from 'react'
import { RiskLevelBadge } from './RiskLevelBadge'
import { RiskFactorBreakdown } from './RiskFactorBreakdown'
import { ActionLogModal } from './ActionLogModal'
import { ACTION_TYPE_LABELS } from '../types'
import type { TurnoverRiskRow } from '../types'

interface Props {
  rows: TurnoverRiskRow[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function RiskRankingTable({ rows }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalEmployee, setModalEmployee] = useState<{
    id: string
    name: string
  } | null>(null)

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        スコアデータがありません。「スコア再計算」ボタンを押してください。
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  順位
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  氏名
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  部署
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  リスクレベル
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  スコア
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  直近アクション
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  算出日
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <>
                  <tr
                    key={row.employee_id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)]`}
                  >
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 font-medium text-gray-900">
                      {row.employee_name}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-600">
                      {row.department_name ?? '—'}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <RiskLevelBadge level={row.risk_level} />
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <span
                        className={`font-bold ${
                          row.risk_score >= 60
                            ? 'text-red-600'
                            : row.risk_score >= 30
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {row.risk_score}
                      </span>
                      <span className="text-gray-400"> / 100</span>
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-600">
                      {row.latest_action_type ? (
                        `${ACTION_TYPE_LABELS[row.latest_action_type]}（${formatDate(row.latest_action_at!)}）`
                      ) : (
                        <span className="text-gray-400">未実施</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-600">
                      {formatDate(row.calculated_at)}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === row.employee_id
                                ? null
                                : row.employee_id
                            )
                          }
                          className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          {expandedId === row.employee_id ? '閉じる' : '詳細'}
                        </button>
                        <button
                          onClick={() =>
                            setModalEmployee({
                              id: row.employee_id,
                              name: row.employee_name,
                            })
                          }
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
                        >
                          記録
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === row.employee_id && (
                    <tr key={`${row.employee_id}-detail`}>
                      <td
                        colSpan={8}
                        className="border-b border-gray-200 bg-gray-50 px-8 py-4"
                      >
                        <RiskFactorBreakdown factors={row.score_factors} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalEmployee && (
        <ActionLogModal
          employeeId={modalEmployee.id}
          employeeName={modalEmployee.name}
          isOpen={true}
          onClose={() => setModalEmployee(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/components/RiskRankingTable.tsx
git commit -m "feat: add RiskRankingTable with expand and action log"
```

---

## Task 12: UI コンポーネント — TurnoverRiskDashboard

**Files:**
- Create: `src/features/turnover-risk/components/TurnoverRiskDashboard.tsx`

- [ ] **Step 1: ダッシュボードコンポーネントを作成する**

```tsx
// src/features/turnover-risk/components/TurnoverRiskDashboard.tsx
'use client'

import { useState } from 'react'
import { RecalculateButton } from './RecalculateButton'
import { RiskRankingTable } from './RiskRankingTable'
import type { TurnoverRiskRow, TurnoverRiskSummary } from '../types'

interface Props {
  rows: TurnoverRiskRow[]
  summary: TurnoverRiskSummary
}

function SummaryCard({
  label,
  count,
  colorClass,
}: {
  label: string
  count: number
  colorClass: string
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className={`text-3xl font-bold ${colorClass}`}>{count}</span>
      <span className="mt-1 text-sm text-gray-600">{label}</span>
    </div>
  )
}

type FilterKey = 'all' | 'high' | 'medium' | 'low'

const PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'high', label: '高リスク' },
  { key: 'medium', label: '中リスク' },
  { key: 'low', label: '低リスク' },
]

export function TurnoverRiskDashboard({ rows, summary }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const lastCalc = summary.lastCalculatedAt
    ? new Date(summary.lastCalculatedAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const filtered =
    filter === 'all' ? rows : rows.filter((r) => r.risk_level === filter)

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/turnover-risk — 離職予兆スコアリング
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              離職予兆スコアリング
            </h1>
            {lastCalc && (
              <p className="mt-1 text-xs text-gray-500">最終算出: {lastCalc}</p>
            )}
          </div>
          <RecalculateButton />
        </div>

        {/* カード本文 */}
        <div className="space-y-6 p-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="対象者合計"
              count={summary.totalCount}
              colorClass="text-gray-800"
            />
            <SummaryCard
              label="高リスク"
              count={summary.highCount}
              colorClass="text-red-600"
            />
            <SummaryCard
              label="中リスク"
              count={summary.mediumCount}
              colorClass="text-yellow-600"
            />
            <SummaryCard
              label="低リスク"
              count={summary.lowCount}
              colorClass="text-green-600"
            />
          </div>

          {/* フィルターバー */}
          <div className="-mx-6 -mt-6 mb-6 flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-3.5">
            {PILLS.map((p) => (
              <button
                key={p.key}
                onClick={() => setFilter(p.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === p.key
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-500">
              {filtered.length} 名
            </span>
          </div>

          {/* ランキングテーブル */}
          <RiskRankingTable rows={filtered} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/turnover-risk/components/TurnoverRiskDashboard.tsx
git commit -m "feat: add TurnoverRiskDashboard with summary cards and filter"
```

---

## Task 13: ページルートを作成する

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk/error.tsx`

- [ ] **Step 1: ルートグループディレクトリを作成する**

```bash
mkdir -p "src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk"
```

- [ ] **Step 2: page.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getTurnoverRiskRows,
  getTurnoverRiskSummary,
} from '@/features/turnover-risk/queries'
import { TurnoverRiskDashboard } from '@/features/turnover-risk/components/TurnoverRiskDashboard'

export const metadata = { title: '離職予兆スコアリング' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function TurnoverRiskPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [rows, summary] = await Promise.all([
    getTurnoverRiskRows(),
    getTurnoverRiskSummary(),
  ])

  return <TurnoverRiskDashboard rows={rows} summary={summary} />
}
```

- [ ] **Step 3: loading.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk/loading.tsx
export default function Loading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-300" />
        </div>
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-400" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: error.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(turnover_risk)/turnover-risk/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-200 bg-red-50 px-6 py-5">
          <h2 className="text-lg font-bold text-red-700">
            エラーが発生しました
          </h2>
          <p className="mt-1 text-sm text-red-600">{error.message}</p>
        </div>
        <div className="p-6">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: コミットする**

```bash
git add "src/app/(tenant)/(colored)/adm/(turnover_risk)/"
git commit -m "feat: add turnover-risk page route with loading and error"
```

---

## Task 14: 型チェックとビルド確認

- [ ] **Step 1: 型チェックを実行する**

```bash
npm run type-check
```

期待される出力：エラーなし（0 errors）

もし型エラーが出た場合は以下の点を確認する：
- `queries.ts` の `employees.divisions` の型アサーション（`Array.isArray` 分岐で対応済み）
- `APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK` が `routes.ts` に追加済みか
- `score_factors as never` を `score_factors as ScoreFactors` に変更してエラー内容を確認

- [ ] **Step 2: ビルドを実行する**

```bash
npm run build
```

期待される出力：`✓ Compiled successfully`

- [ ] **Step 3: 開発サーバーで動作確認する**

```bash
npm run dev
```

ブラウザで `http://localhost:3000/adm/turnover-risk` にアクセスし、以下を確認する：
1. ページが表示される（loading → data）
2. サマリーカード（合計・高・中・低）が 4 つ表示される
3. 「スコア再計算」ボタンを押すと成功メッセージが出る
4. 再計算後にテーブルが表示される
5. テーブル行の「詳細」をクリックすると因子内訳が展開される
6. 「記録」ボタンでモーダルが開き、種別・メモを入力して送信できる
7. フィルターピルで高/中/低に絞り込みできる

- [ ] **Step 4: コミットする**

```bash
git commit -m "feat: P2-A complete - turnover risk scoring dashboard"
```

---

## 実装上の注意事項

### 既存テーブル参照の注意

以下のテーブルは **読み取り専用** 参照のみ。INSERT / UPDATE / DELETE は一切行わない：

| テーブル | 使用目的 |
|---|---|
| `employees` | 従業員一覧・在籍確認 |
| `stress_check_results` | 高ストレス判定取得 |
| `work_time_records` | 残業時間計算 |
| `survey_response_aggregates` | パルスサーベイスコア（存在しない場合は `null` 扱い） |
| `questionnaire_assignments` | アンケートアサイン履歴 |
| `questionnaire_responses` | アンケート回答履歴 |

### `survey_response_aggregates` テーブルが存在しない場合

Task 4 では `survey_response_aggregates` からデータを取得する。このテーブルが存在しない（またはデータがない）場合、クエリは空配列を返し `latest_survey_score: null` として扱われる（スコアへの寄与は 0）。実際のテーブル名は Supabase Studio で確認し、異なる場合は `from(...)` の引数を修正する。

### スコア計算の周期

本実装では手動「スコア再計算」ボタンによる更新のみ対応する。ボタンを押すたびに全従業員分の新しいスナップショットが `turnover_risk_scores` に INSERT される（過去データは保持される）。自動バッチ処理は Phase 3 以降で検討する。

---

## Self-Review チェックリスト

- [x] **Spec カバレッジ確認**
  - 複合リスクスコア計算 → Task 3 (score-calculator.ts)
  - 従業員別リスクランキング（高・中・低）→ Task 11 (RiskRankingTable)
  - リスク要因の内訳表示 → Task 8 (RiskFactorBreakdown)
  - ハイリスク者へのアクションログ記録 → Task 9 (ActionLogModal) + Task 5 (actions.ts)
  - 入社3・6ヶ月の定着チェックポイント通知 → **未実装（`hired_at` カラムとの組み合わせが必要。Phase 3 以降で対応）**

- [x] **プレースホルダーなし確認** — 全ステップにコードブロックを記載済み

- [x] **型整合性確認** — `ScoreFactors`, `TurnoverRiskRow`, `ActionType` は Task 2 で定義し、Task 3〜13 で一貫して使用

- [x] **セキュリティ確認**
  - 新規 RLS ポリシーを両テーブルに設定済み
  - `createAdminClient()` は使用しない
  - Zod バリデーションを `actions.ts` で実施
  - 権限チェック（`ALLOWED_ROLES`）を全 Server Action に実装

### 未実装事項（Phase 3 以降で対応）

- 入社 3・6 ヶ月定着チェックポイント通知
- スコアの自動定期再計算（Supabase Edge Functions）
- 部署別リスクヒートマップ
- 過去スコアトレンドグラフ（Recharts）

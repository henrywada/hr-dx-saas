/**
 * 残業しきい値・違反判定ユーティリティ
 *
 * 働き方改革関連法（改正労働基準法）の法定上限を基準とし、
 * テナントの overtime_settings でカスタマイズ可能。
 *
 * 参考: 解説書 21ページ「法違反となるケースの例」
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// =============================================================================
// 型定義
// =============================================================================

/** 残業しきい値設定 */
export type OvertimeThresholds = {
  /** 原則の月間上限（時間） ※デフォルト: 45h */
  monthlyLimit: number
  /** 警告ライン（時間） ※デフォルト: 40h */
  monthlyWarning: number
  /** 原則の年間上限（時間） ※デフォルト: 360h */
  annualLimit: number
  /** 特別条項: 2〜6ヶ月平均上限（時間） ※デフォルト: 80h */
  averageLimit: number
  /** 特別条項: 単月上限（時間） ※100h 未満かつ 100h は違反 */
  singleMonthSpecialLimit: number
  /** 特別条項: 年間上限（時間） ※デフォルト: 720h */
  annualSpecialLimit: number
  /** 特別条項: 年間適用上限回数 ※デフォルト: 6回 */
  specialClauseMaxCount: number
}

/** 月別の残業データ（判定に使う最小単位） */
export type MonthlyOvertimeData = {
  /** YYYY-MM 形式 */
  yearMonth: string
  /** 時間外労働＋休日労働の合計（時間） */
  totalHours: number
}

/** 残業ステータス */
export type OvertimeStatus =
  | 'safe'      // 45h 以内（安全域）
  | 'warning'   // 45h超〜60h以下（特別条項適用の可能性）
  | 'danger'    // 60h超〜80h以下（複数月平均リスク）
  | 'critical'  // 80h超〜100h未満、または複数月平均80h超
  | 'violation' // 100h以上、または年6回超過（法違反確定）

/** 月別ステータス判定結果（詳細情報付き） */
export type MonthlyStatusResult = {
  yearMonth: string
  totalHours: number
  status: OvertimeStatus
  /** 違反理由（複数ある場合はすべて列挙） */
  reasons: string[]
  /** 年間累計（その月時点） */
  annualCumulative: number
  /** 45h超過の発生回数（その月時点） */
  overMonthlyLimitCount: number
  /** 直近2〜6ヶ月平均のうち最大値 */
  maxRecentAverage: number | null
}

// =============================================================================
// デフォルト値（働き方改革関連法の法定上限）
// =============================================================================

export const DEFAULT_THRESHOLDS: OvertimeThresholds = {
  monthlyLimit: 45,         // 原則: 月45時間
  monthlyWarning: 40,       // 警告ライン: 月40時間
  annualLimit: 360,         // 原則: 年360時間
  averageLimit: 80,         // 特別条項: 2〜6ヶ月平均80時間以内
  singleMonthSpecialLimit: 100, // 特別条項: 単月100時間未満（100h は違反）
  annualSpecialLimit: 720,  // 特別条項: 年間720時間以内
  specialClauseMaxCount: 6, // 特別条項: 年6回まで
}

// =============================================================================
// overtime_settings テーブルからしきい値を取得
// =============================================================================

/**
 * テナントの overtime_settings を取得し、未設定時はデフォルト値を返す
 *
 * @param supabase - Supabase クライアント（一般ユーザー用。RLS適用）
 * @returns OvertimeThresholds
 */
export async function getOvertimeThresholds(
  supabase: SupabaseClient<Database>,
): Promise<OvertimeThresholds> {
  const { data, error } = await supabase
    .from('overtime_settings')
    .select(
      'monthly_limit_hours, monthly_warning_hours, annual_limit_hours, average_limit_hours',
    )
    .maybeSingle()

  if (error || !data) {
    // 取得失敗・未設定の場合は法定上限デフォルト値を使用
    return DEFAULT_THRESHOLDS
  }

  return {
    monthlyLimit: data.monthly_limit_hours ?? DEFAULT_THRESHOLDS.monthlyLimit,
    monthlyWarning: data.monthly_warning_hours ?? DEFAULT_THRESHOLDS.monthlyWarning,
    annualLimit: data.annual_limit_hours ?? DEFAULT_THRESHOLDS.annualLimit,
    averageLimit: data.average_limit_hours ?? DEFAULT_THRESHOLDS.averageLimit,
    // 以下は overtime_settings に列がないため常にデフォルト値
    singleMonthSpecialLimit: DEFAULT_THRESHOLDS.singleMonthSpecialLimit,
    annualSpecialLimit: DEFAULT_THRESHOLDS.annualSpecialLimit,
    specialClauseMaxCount: DEFAULT_THRESHOLDS.specialClauseMaxCount,
  }
}

// =============================================================================
// しきい値なしで単月の OvertimeStatus を判定（同期版・簡易）
// =============================================================================

/**
 * 月間残業時間から OvertimeStatus を返す（単月判定・簡易版）
 *
 * ステータス定義:
 *   safe      : monthlyLimit 以内
 *   warning   : monthlyLimit 超〜60h 以下
 *   danger    : 60h 超〜 averageLimit (80h) 以下
 *   critical  : averageLimit 超〜 singleMonthSpecialLimit (100h) 未満
 *   violation : singleMonthSpecialLimit 以上
 */
export function getSingleMonthStatus(
  totalHours: number,
  thresholds: OvertimeThresholds = DEFAULT_THRESHOLDS,
): OvertimeStatus {
  if (totalHours >= thresholds.singleMonthSpecialLimit) return 'violation'
  if (totalHours > thresholds.averageLimit) return 'critical'
  if (totalHours > 60) return 'danger'
  if (totalHours > thresholds.monthlyLimit) return 'warning'
  return 'safe'
}

// =============================================================================
// 従業員の年間月別データから全月のステータスを判定
// =============================================================================

/**
 * 直近 N ヶ月平均を計算する
 *
 * @param months   - ソート済み（昇順）の月別データ
 * @param targetIdx - 対象月のインデックス
 * @param windowSize - 平均を取る直近 N ヶ月（2〜6）
 * @returns 平均値（データが window に満たない場合は計算した平均）
 */
function calcRecentAverage(
  months: MonthlyOvertimeData[],
  targetIdx: number,
  windowSize: number,
): number {
  // 対象月 "含む" 直近 N ヶ月（含む）
  const start = Math.max(0, targetIdx - windowSize + 1)
  const slice = months.slice(start, targetIdx + 1)
  if (slice.length === 0) return 0
  const sum = slice.reduce((acc, m) => acc + m.totalHours, 0)
  return sum / slice.length
}

/**
 * 従業員の月別残業データ（年間分等）を受け取り、各月の詳細ステータスを返す
 *
 * - 条件A: 単月 100h 以上 → violation
 * - 条件B: 直近2〜6ヶ月平均 > 80h → violation（80h 超）/ critical（80h ちょうど）
 * - 条件C: 月45h 超が年7回目以降 → violation
 * - 条件D: 年間累計 > 720h → violation
 * - それ以外: getSingleMonthStatus による判定
 *
 * @param months - 昇順ソート済みの月別残業データ
 * @param thresholds - しきい値設定（デフォルト: 法定上限）
 * @returns 月ごとの詳細ステータス結果
 */
export function calcMonthlyStatuses(
  months: MonthlyOvertimeData[],
  thresholds: OvertimeThresholds = DEFAULT_THRESHOLDS,
): MonthlyStatusResult[] {
  // 昇順ソート（念のため）
  const sorted = [...months].sort((a, b) =>
    a.yearMonth.localeCompare(b.yearMonth),
  )

  let annualCumulative = 0
  let overMonthlyLimitCount = 0

  return sorted.map((month, idx): MonthlyStatusResult => {
    annualCumulative += month.totalHours
    const reasons: string[] = []

    // 45h 超過カウント（今月含む、の累積）
    const isOverMonthlyLimit = month.totalHours > thresholds.monthlyLimit
    if (isOverMonthlyLimit) overMonthlyLimitCount++
    const currentOverCount = overMonthlyLimitCount // この月時点のカウント

    // --- 違反 / リスク判定 ---

    // 【条件A】単月 100h 以上
    const isConditionA = month.totalHours >= thresholds.singleMonthSpecialLimit
    if (isConditionA) {
      reasons.push(
        `月間100時間超過（100h以上の時間外・休日労働は法違反）`,
      )
    }

    // 【条件B】直近2〜6ヶ月平均 > averageLimit (80h)
    let maxRecentAverage: number | null = null
    let isConditionB = false
    for (let w = 2; w <= 6; w++) {
      if (idx < w - 1) continue // データが足りない場合はスキップ
      const avg = calcRecentAverage(sorted, idx, w)
      if (maxRecentAverage === null || avg > maxRecentAverage) {
        maxRecentAverage = avg
      }
      if (avg > thresholds.averageLimit) {
        isConditionB = true
        reasons.push(
          `直近${w}ヶ月平均 ${avg.toFixed(1)}h が ${thresholds.averageLimit}h 超過`,
        )
        break // 最初に違反した窓サイズで打ち止め
      }
    }

    // 【条件C】月45h 超が年7回目以降
    const isConditionC =
      isOverMonthlyLimit && currentOverCount > thresholds.specialClauseMaxCount
    if (isConditionC) {
      reasons.push(
        `月45h超過が年${currentOverCount}回目（特別条項年${thresholds.specialClauseMaxCount}回の上限超過）`,
      )
    }

    // 【条件D】年間累計 > 720h
    const isConditionD = annualCumulative > thresholds.annualSpecialLimit
    if (isConditionD) {
      reasons.push(
        `年間累計 ${annualCumulative.toFixed(1)}h が ${thresholds.annualSpecialLimit}h 超過`,
      )
    }

    // --- ステータス決定 ---
    let status: OvertimeStatus

    if (isConditionA || isConditionB || isConditionC || isConditionD) {
      status = 'violation'
    } else {
      // 複数月平均が 80h に近い（critical 判定を maxRecentAverage で補完）
      const avgRisk =
        maxRecentAverage !== null && maxRecentAverage > thresholds.averageLimit
      status = getSingleMonthStatus(month.totalHours, thresholds)

      // 平均リスクがある場合は critical に引き上げ
      if (avgRisk && status !== 'violation' && status !== 'critical') {
        status = 'critical'
        reasons.push(
          `直近複数月平均 ${maxRecentAverage!.toFixed(1)}h が ${thresholds.averageLimit}h 超過`,
        )
      }
    }

    return {
      yearMonth: month.yearMonth,
      totalHours: month.totalHours,
      status,
      reasons,
      annualCumulative,
      overMonthlyLimitCount: currentOverCount,
      maxRecentAverage,
    }
  })
}

// =============================================================================
// KPI 集計ヘルパー
// =============================================================================

/** 従業員ごとの年間サマリー */
export type EmployeeAnnualSummary = {
  employeeId: string
  employeeName: string
  departmentName: string
  /** 12ヶ月分の月別残業データ（昇順） */
  months: MonthlyOvertimeData[]
}

/** KPI 集計結果 */
export type OvertimeKpiResult = {
  totalEmployees: number
  /** 法違反確定（violation）人数 */
  violationCount: number
  /** 違反予備軍（月45h 超の人数）*/
  warningCount: number
  /** 特別条項適用者数（45h超月が1回以上ある人） */
  specialClauseCount: number
}

/**
 * 従業員リストから KPI を集計する
 *
 * @param employees - 従業員の年間サマリーリスト
 * @param thresholds - しきい値
 * @returns KPI 集計結果
 */
export function calcOvertimeKpi(
  employees: EmployeeAnnualSummary[],
  thresholds: OvertimeThresholds = DEFAULT_THRESHOLDS,
): OvertimeKpiResult {
  let violationCount = 0
  let warningCount = 0
  let specialClauseCount = 0

  for (const emp of employees) {
    const statuses = calcMonthlyStatuses(emp.months, thresholds)

    // 1度でも violation があれば法違反確定
    const hasViolation = statuses.some((s) => s.status === 'violation')
    if (hasViolation) violationCount++

    // 月45h を1回でも超えた人 → 違反予備軍
    const hasOverMonthly = emp.months.some(
      (m) => m.totalHours > thresholds.monthlyLimit,
    )
    if (hasOverMonthly) warningCount++

    // 特別条項: 45h 超月が 1 回以上かつ violation ではない人（適用者）
    // または violation も含めて「適用中」として計上
    if (hasOverMonthly) specialClauseCount++
  }

  return {
    totalEmployees: employees.length,
    violationCount,
    warningCount,
    specialClauseCount,
  }
}

// =============================================================================
// ステータスのラベル・色取得ヘルパー
// =============================================================================

/** ステータスに対応する日本語ラベル */
export const STATUS_LABELS: Record<OvertimeStatus, string> = {
  safe: '安全',
  warning: '注意',
  danger: '危険',
  critical: '重大',
  violation: '法違反',
}

/** ステータスに対応する Tailwind CSS クラス（背景色） */
export const STATUS_BG_CLASSES: Record<OvertimeStatus, string> = {
  safe: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  violation: 'bg-red-900 text-white',
}

/** ステータスに対応する Recharts 用カラーコード */
export const STATUS_COLORS: Record<OvertimeStatus, string> = {
  safe: '#10b981',     // emerald-500
  warning: '#f59e0b',  // amber-500
  danger: '#f97316',   // orange-500
  critical: '#ef4444', // red-500
  violation: '#7f1d1d', // red-900
}

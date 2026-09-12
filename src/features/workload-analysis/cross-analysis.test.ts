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

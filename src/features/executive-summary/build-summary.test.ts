import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAlertHighlights, buildKpiHeadlines } from './build-summary'

test('buildAlertHighlights: 3件とも0件ならすべて isAlert=false', () => {
  const result = buildAlertHighlights({
    turnoverRiskHighCount: 0,
    engagementAlertDepartmentCount: 0,
    oneOnOneOverdueCount: 0,
  })
  assert.equal(result.length, 3)
  assert.ok(result.every(h => h.isAlert === false))
})

test('buildAlertHighlights: 件数が1以上のものだけ isAlert=true になる', () => {
  const result = buildAlertHighlights({
    turnoverRiskHighCount: 3,
    engagementAlertDepartmentCount: 0,
    oneOnOneOverdueCount: 5,
  })
  const byKey = Object.fromEntries(result.map(h => [h.key, h]))
  assert.equal(byKey.turnoverRisk.isAlert, true)
  assert.equal(byKey.turnoverRisk.count, 3)
  assert.equal(byKey.engagementAlert.isAlert, false)
  assert.equal(byKey.engagementAlert.count, 0)
  assert.equal(byKey.oneOnOneOverdue.isAlert, true)
  assert.equal(byKey.oneOnOneOverdue.count, 5)
})

test('buildAlertHighlights: 各カードに href が設定される', () => {
  const result = buildAlertHighlights({
    turnoverRiskHighCount: 1,
    engagementAlertDepartmentCount: 1,
    oneOnOneOverdueCount: 1,
  })
  assert.ok(result.every(h => typeof h.href === 'string' && h.href.startsWith('/adm/')))
})

test('buildKpiHeadlines: HrKpiBundle から5指標を抜粋する', () => {
  const result = buildKpiHeadlines({
    retention: { turnoverRatePercent: 12.5 },
    engagement: { latestPulseSurveyScore: 4.1 },
    productivity: {
      avgOvertimeHoursThisMonth: 18.2,
      paidLeaveUtilizationPercent: 63,
    },
    development: { elCompletionRatePercent: 71 },
  })
  assert.equal(result.length, 5)
  const byLabel = Object.fromEntries(result.map(k => [k.label, k.value]))
  assert.equal(byLabel['離職率'], 12.5)
  assert.equal(byLabel['エンゲージメントスコア'], 4.1)
  assert.equal(byLabel['平均残業時間'], 18.2)
  assert.equal(byLabel['有休取得率'], 63)
  assert.equal(byLabel['育成完了率'], 71)
})

test('buildKpiHeadlines: 値が null の指標はそのまま null を返す（表示側で "—" にする）', () => {
  const result = buildKpiHeadlines({
    retention: { turnoverRatePercent: null },
    engagement: { latestPulseSurveyScore: null },
    productivity: {
      avgOvertimeHoursThisMonth: null,
      paidLeaveUtilizationPercent: null,
    },
    development: { elCompletionRatePercent: null },
  })
  assert.ok(result.every(k => k.value === null))
})

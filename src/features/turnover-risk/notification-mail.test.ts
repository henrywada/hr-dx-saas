import assert from 'node:assert/strict'
import test from 'node:test'

import {
  describeTopRiskFactors,
  buildManagerAlertEmail,
  buildHrDigestEmail,
} from './notification-mail'
import type { ScoreFactors } from './types'

function makeFactors(overrides: Partial<ScoreFactors> = {}): ScoreFactors {
  return {
    stress_score: 0,
    survey_score: 0,
    overtime_score: 0,
    absence_score: 0,
    growth_score: 0,
    details: {
      is_high_stress: false,
      latest_survey_score: null,
      overtime_hours_last_month: 0,
      overtime_delta_hours: 0,
      unanswered_questionnaire_count: 0,
      growth: {
        one_on_one_overdue_30d: false,
        evaluation_not_confirmed: false,
        has_skill_gap: false,
        has_incomplete_el: false,
      },
    },
    ...overrides,
  }
}

test('describeTopRiskFactors: スコアが高い要因順に説明文を返す', () => {
  const factors = makeFactors({ stress_score: 35, overtime_score: 20, survey_score: 30 })
  const result = describeTopRiskFactors(factors)
  assert.deepEqual(result, ['ストレスチェックで高ストレス判定', 'パルスサーベイのスコアが低下'])
})

test('describeTopRiskFactors: スコアが0の要因は除外する', () => {
  const factors = makeFactors({ overtime_score: 20 })
  const result = describeTopRiskFactors(factors)
  assert.deepEqual(result, ['残業時間の増加'])
})

test('describeTopRiskFactors: limit で上位件数を制御できる', () => {
  const factors = makeFactors({
    stress_score: 35,
    survey_score: 30,
    overtime_score: 20,
    absence_score: 15,
    growth_score: 12,
  })
  const result = describeTopRiskFactors(factors, 3)
  assert.deepEqual(result, [
    'ストレスチェックで高ストレス判定',
    'パルスサーベイのスコアが低下',
    '残業時間の増加',
  ])
})

test('describeTopRiskFactors: 全要因0なら空配列', () => {
  assert.deepEqual(describeTopRiskFactors(makeFactors()), [])
})

test('buildManagerAlertEmail: 件名・本文に必要な情報が含まれる', () => {
  const { subject, html } = buildManagerAlertEmail({
    employeeName: '山田太郎',
    departmentName: '営業部',
    riskScore: 65,
    topFactors: ['ストレスチェックで高ストレス判定', '残業時間の増加'],
    dashboardUrl: 'https://app.hr-dx.jp/adm/turnover-risk',
  })
  assert.equal(subject, '【要対応】山田太郎さんの離職リスクが「高」に上昇しました')
  assert.match(html, /山田太郎/)
  assert.match(html, /営業部/)
  assert.match(html, /65/)
  assert.match(html, /ストレスチェックで高ストレス判定/)
  assert.match(html, /残業時間の増加/)
  assert.match(html, /https:\/\/app\.hr-dx\.jp\/adm\/turnover-risk/)
})

test('buildManagerAlertEmail: 部署未配属の場合はフォールバック文言を使う', () => {
  const { html } = buildManagerAlertEmail({
    employeeName: '鈴木花子',
    departmentName: null,
    riskScore: 60,
    topFactors: [],
    dashboardUrl: 'https://app.hr-dx.jp/adm/turnover-risk',
  })
  assert.match(html, /未配属/)
})

test('buildManagerAlertEmail: 氏名・部署名の特殊文字はHTMLエスケープされる', () => {
  const { html } = buildManagerAlertEmail({
    employeeName: '<script>alert(1)</script>',
    departmentName: 'A&B部',
    riskScore: 60,
    topFactors: [],
    dashboardUrl: 'https://app.hr-dx.jp/adm/turnover-risk',
  })
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /A&amp;B部/)
})

test('buildHrDigestEmail: 件名に対象人数、本文に全員分の情報が含まれる', () => {
  const { subject, html } = buildHrDigestEmail({
    transitions: [
      { employeeName: '山田太郎', departmentName: '営業部', riskScore: 65 },
      { employeeName: '佐藤次郎', departmentName: null, riskScore: 72 },
    ],
    dashboardUrl: 'https://app.hr-dx.jp/adm/turnover-risk',
  })
  assert.equal(subject, '【離職リスクアラート】新たに2名が高リスクに該当しました')
  assert.match(html, /山田太郎/)
  assert.match(html, /営業部/)
  assert.match(html, /65/)
  assert.match(html, /佐藤次郎/)
  assert.match(html, /72/)
  assert.match(html, /未配属/)
  assert.match(html, /https:\/\/app\.hr-dx\.jp\/adm\/turnover-risk/)
})

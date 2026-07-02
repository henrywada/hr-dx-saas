import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatEngagementFactorLines,
  buildManagerAlertEmail,
  buildHrDigestEmail,
} from './alert-notification-mail'

test('formatEngagementFactorLines: データがある指標のみ整形して返す', () => {
  const result = formatEngagementFactorLines({
    pulseScore: 2.8,
    highStressRate: 35,
    questionnaireResponseRate: 40,
  })
  assert.deepEqual(result, [
    'パルスサーベイ: 2.8 / 5.0',
    '高ストレス率: 35%',
    'アンケート回答率: 40%',
  ])
})

test('formatEngagementFactorLines: データがない指標は除外する', () => {
  const result = formatEngagementFactorLines({
    pulseScore: null,
    highStressRate: 35,
    questionnaireResponseRate: null,
  })
  assert.deepEqual(result, ['高ストレス率: 35%'])
})

test('formatEngagementFactorLines: 全指標データなしなら空配列', () => {
  const result = formatEngagementFactorLines({
    pulseScore: null,
    highStressRate: null,
    questionnaireResponseRate: null,
  })
  assert.deepEqual(result, [])
})

test('buildManagerAlertEmail: 件名・本文に必要な情報が含まれる', () => {
  const { subject, html } = buildManagerAlertEmail({
    divisionName: '営業部',
    compositeScore: 38,
    factorLines: ['パルスサーベイ: 2.8 / 5.0', '高ストレス率: 35%'],
    dashboardUrl: 'https://app.hr-dx.jp/adm/engagement',
  })
  assert.equal(subject, '【要確認】営業部のエンゲージメントスコアが低下しています')
  assert.match(html, /営業部/)
  assert.match(html, /38/)
  assert.match(html, /パルスサーベイ: 2\.8 \/ 5\.0/)
  assert.match(html, /高ストレス率: 35%/)
  assert.match(html, /https:\/\/app\.hr-dx\.jp\/adm\/engagement/)
})

test('buildManagerAlertEmail: 氏名・部署名の特殊文字はHTMLエスケープされる', () => {
  const { html } = buildManagerAlertEmail({
    divisionName: '<script>alert(1)</script>',
    compositeScore: 30,
    factorLines: [],
    dashboardUrl: 'https://app.hr-dx.jp/adm/engagement',
  })
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
})

test('buildHrDigestEmail: 件名に対象部署数、本文に全部署分の情報が含まれる', () => {
  const { subject, html } = buildHrDigestEmail({
    transitions: [
      { divisionName: '営業部', compositeScore: 38 },
      { divisionName: '開発部', compositeScore: 42 },
    ],
    dashboardUrl: 'https://app.hr-dx.jp/adm/engagement',
  })
  assert.equal(subject, '【エンゲージメントアラート】新たに2部署が要注意状態になりました')
  assert.match(html, /営業部/)
  assert.match(html, /38/)
  assert.match(html, /開発部/)
  assert.match(html, /42/)
  assert.match(html, /https:\/\/app\.hr-dx\.jp\/adm\/engagement/)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDigest,
  formatAmount,
  formatJstDate,
} from '@/features/grant-notifier/batch/deliver/digest'
import type { DeliverableGrant } from '@/features/grant-notifier/types'

function grant(overrides: Partial<DeliverableGrant> = {}): DeliverableGrant {
  return {
    grantId: 'g-1',
    title: 'キャリアアップ助成金',
    summary: '非正規雇用の処遇改善',
    issuer: '国',
    targetArea: '全国',
    targetEmployees: '制約なし',
    maxAmount: 570000,
    subsidyRate: '1/2',
    acceptanceEndAt: '2027-03-31T14:59:00.000Z',
    externalUrl: 'https://example.com/a',
    fetchedAt: '2026-06-13T00:00:00.000Z',
    verdict: '適合',
    reasons: ['雇用カテゴリに一致'],
    ...overrides,
  }
}

const urls = {
  unsubscribeUrl: 'https://app.example/p/grant-notifier/unsubscribe?token=abc',
  conditionsUrl: 'https://app.example/adm/grant-notifier/conditions',
  archiveUrl: 'https://app.example/adm/grant-notifier/archive',
}

test('formatJstDate は ISO8601 を JST の yyyy/mm/dd にする', () => {
  // 2027-03-31T14:59Z = 2027-03-31 23:59 JST
  assert.equal(formatJstDate('2027-03-31T14:59:00.000Z'), '2027/03/31')
})

test('formatJstDate は日付境界をまたぐ UTC を JST の翌日にする', () => {
  // 2026-06-12T15:00Z = 2026-06-13 00:00 JST
  assert.equal(formatJstDate('2026-06-12T15:00:00.000Z'), '2026/06/13')
})

test('formatJstDate は null・不正な値に「不明」を返す', () => {
  assert.equal(formatJstDate(null), '不明')
  assert.equal(formatJstDate('nope'), '不明')
})

test('formatAmount は桁区切り付きの円表記にする', () => {
  assert.equal(formatAmount(570000), '〜570,000円')
})

test('formatAmount は null・0 に「記載なし」を返す', () => {
  assert.equal(formatAmount(null), '記載なし')
  assert.equal(formatAmount(0), '記載なし')
})

test('buildDigest は件数入りの件名と助成金詳細・フッタを含む', () => {
  const digest = buildDigest({ grants: [grant()], ...urls })

  assert.equal(digest.subject, '【助成金情報】新着1件のお知らせ')
  assert.ok(digest.text.includes('キャリアアップ助成金'))
  assert.ok(digest.text.includes('〜570,000円'))
  assert.ok(digest.text.includes(urls.unsubscribeUrl))
  assert.ok(digest.text.includes(urls.conditionsUrl))
  assert.ok(digest.html.includes('配信停止'))
  assert.ok(digest.html.includes('公式情報'))
})

test('buildDigest は助成金タイトルの横に判定マークを付けない', () => {
  const digest = buildDigest({ grants: [grant({ verdict: '要確認' })], ...urls })

  assert.ok(!digest.text.includes('◯適合'))
  assert.ok(!digest.text.includes('△要確認'))
  assert.ok(!digest.html.includes('◯適合'))
  assert.ok(!digest.html.includes('△要確認'))
})

test('buildDigest はタイトル中の HTML をエスケープする', () => {
  const digest = buildDigest({
    grants: [grant({ title: '<script>x</script>助成金' })],
    ...urls,
  })

  assert.ok(!digest.html.includes('<script>x</script>'))
  assert.ok(digest.html.includes('&lt;script&gt;'))
})

test('buildDigest は maxItems で件数を抑え、超過分をアーカイブへ誘導する', () => {
  const grants = Array.from({ length: 5 }, (_, i) =>
    grant({ grantId: `g-${i}`, title: `助成金${i}` })
  )

  const digest = buildDigest({ grants, ...urls, maxItems: 3 })

  assert.ok(digest.text.includes('他 2 件'))
  assert.ok(digest.text.includes(urls.archiveUrl))
  assert.equal(digest.subject, '【助成金情報】新着5件のお知らせ')
  // 本文に載るのは 3 件のみ
  assert.equal(digest.html.match(/詳細・申請はこちら/g)?.length, 3)
})

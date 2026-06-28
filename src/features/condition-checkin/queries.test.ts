import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTrendSeries } from './queries'

test('欠損日はscore: nullで埋められる', () => {
  const series = buildTrendSeries([{ checkin_date: '2026-06-26', score: 4 }], 3, '2026-06-28')
  assert.deepEqual(series, [
    { checkin_date: '2026-06-26', score: 4 },
    { checkin_date: '2026-06-27', score: null },
    { checkin_date: '2026-06-28', score: null },
  ])
})

test('days=1ではtodayYmdの1日のみ返す', () => {
  const series = buildTrendSeries([{ checkin_date: '2026-06-28', score: 5 }], 1, '2026-06-28')
  assert.deepEqual(series, [{ checkin_date: '2026-06-28', score: 5 }])
})

test('範囲外の日付（範囲より過去）は結果に含まれない', () => {
  const series = buildTrendSeries(
    [
      { checkin_date: '2026-05-01', score: 2 },
      { checkin_date: '2026-06-28', score: 3 },
    ],
    2,
    '2026-06-28'
  )
  assert.deepEqual(series, [
    { checkin_date: '2026-06-27', score: null },
    { checkin_date: '2026-06-28', score: 3 },
  ])
})

test('月境界をまたいでも正しく日付配列を生成する', () => {
  const series = buildTrendSeries([], 3, '2026-07-01')
  assert.deepEqual(
    series.map(p => p.checkin_date),
    ['2026-06-29', '2026-06-30', '2026-07-01']
  )
})

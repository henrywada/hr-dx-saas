import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatAmount,
  formatDuration,
  formatJstDate,
} from '@/features/grant-notifier/components/format'

test('formatJstDate は JST の日付で表示する', () => {
  // 2026-08-06T15:00Z = 2026-08-07 00:00 JST
  assert.equal(formatJstDate('2026-08-06T15:00:00.000Z'), '2026/08/07')
})

test('formatJstDate は null・不正な値に「—」を返す', () => {
  assert.equal(formatJstDate(null), '—')
  assert.equal(formatJstDate('nope'), '—')
})

test('formatAmount は桁区切り付きの円表記にする', () => {
  assert.equal(formatAmount(570000), '〜570,000円')
  assert.equal(formatAmount(null), '記載なし')
  assert.equal(formatAmount(0), '記載なし')
})

test('formatDuration は分と秒の表記にする', () => {
  assert.equal(formatDuration('2026-08-07T00:00:00.000Z', '2026-08-07T00:02:05.000Z'), '2分5秒')
  assert.equal(formatDuration('2026-08-07T00:00:00.000Z', '2026-08-07T00:00:42.000Z'), '42秒')
})

test('formatDuration は実行中（終了未確定）に「—」を返す', () => {
  assert.equal(formatDuration('2026-08-07T00:00:00.000Z', null), '—')
})

test('formatDuration は終了が開始より前なら「—」を返す', () => {
  assert.equal(formatDuration('2026-08-07T00:05:00.000Z', '2026-08-07T00:00:00.000Z'), '—')
})

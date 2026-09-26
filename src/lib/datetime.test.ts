import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDateInJST, formatDateTimeInJST } from './datetime'

test('日付のみ（YYYY-MM-DD）は日付だけを返し、時刻を付けない', () => {
  assert.equal(formatDateInJST('2026-09-26'), '2026/09/26')
})

test('日付のみを日時整形すると UTC 0時扱いになり JST 9:00:00 と表示される（出荷日には使わない）', () => {
  assert.match(formatDateTimeInJST('2026-09-26'), /9:00:00$/)
})

test('timestamptz は JST の日付に変換する', () => {
  assert.equal(formatDateInJST('2026-09-25T15:30:00Z'), '2026/09/26')
})

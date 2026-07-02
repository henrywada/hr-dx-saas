import assert from 'node:assert/strict'
import test from 'node:test'

import { computePulseTrendDirection, isOneOnOneOverdue } from './condition-summary'

test('computePulseTrendDirection: データなしなら no_data', () => {
  assert.equal(computePulseTrendDirection([]), 'no_data')
})

test('computePulseTrendDirection: 1件のみなら flat', () => {
  assert.equal(computePulseTrendDirection([{ period: '2026-06', score: 3.5 }]), 'flat')
})

test('computePulseTrendDirection: 最新が最古より高ければ up', () => {
  const trend = [
    { period: '2026-04', score: 2.8 },
    { period: '2026-05', score: 3.0 },
    { period: '2026-06', score: 3.4 },
  ]
  assert.equal(computePulseTrendDirection(trend), 'up')
})

test('computePulseTrendDirection: 最新が最古より低ければ down', () => {
  const trend = [
    { period: '2026-04', score: 3.6 },
    { period: '2026-05', score: 3.2 },
    { period: '2026-06', score: 2.8 },
  ]
  assert.equal(computePulseTrendDirection(trend), 'down')
})

test('computePulseTrendDirection: 最新と最古が同じなら flat', () => {
  const trend = [
    { period: '2026-04', score: 3.0 },
    { period: '2026-05', score: 2.5 },
    { period: '2026-06', score: 3.0 },
  ]
  assert.equal(computePulseTrendDirection(trend), 'flat')
})

test('isOneOnOneOverdue: 実施記録なし（null）は overdue 扱い', () => {
  assert.equal(isOneOnOneOverdue(null), true)
})

test('isOneOnOneOverdue: 30日以上経過していれば true', () => {
  assert.equal(isOneOnOneOverdue(30), true)
  assert.equal(isOneOnOneOverdue(45), true)
})

test('isOneOnOneOverdue: 30日未満なら false', () => {
  assert.equal(isOneOnOneOverdue(0), false)
  assert.equal(isOneOnOneOverdue(29), false)
})

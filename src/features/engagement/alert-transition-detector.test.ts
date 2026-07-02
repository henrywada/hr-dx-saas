import assert from 'node:assert/strict'
import test from 'node:test'

import { detectAlertTransitions } from './alert-transition-detector'

test('初回計算でいきなり alert になった場合は通知対象（previous_status: none）', () => {
  const result = detectAlertTransitions(new Map(), [
    { division_id: 'div-1', composite_score: 30, status: 'alert' },
  ])
  assert.deepEqual(result, [{ division_id: 'div-1', composite_score: 30, previous_status: 'none' }])
})

test('caution から alert への遷移は通知対象', () => {
  const previous = new Map([['div-1', 'caution' as const]])
  const result = detectAlertTransitions(previous, [
    { division_id: 'div-1', composite_score: 40, status: 'alert' },
  ])
  assert.deepEqual(result, [
    { division_id: 'div-1', composite_score: 40, previous_status: 'caution' },
  ])
})

test('good から alert への遷移は通知対象', () => {
  const previous = new Map([['div-1', 'good' as const]])
  const result = detectAlertTransitions(previous, [
    { division_id: 'div-1', composite_score: 20, status: 'alert' },
  ])
  assert.deepEqual(result, [{ division_id: 'div-1', composite_score: 20, previous_status: 'good' }])
})

test('alert が継続している場合は再通知しない', () => {
  const previous = new Map([['div-1', 'alert' as const]])
  const result = detectAlertTransitions(previous, [
    { division_id: 'div-1', composite_score: 10, status: 'alert' },
  ])
  assert.deepEqual(result, [])
})

test('alert から回復した場合は通知しない', () => {
  const previous = new Map([['div-1', 'alert' as const]])
  const result = detectAlertTransitions(previous, [
    { division_id: 'div-1', composite_score: 50, status: 'caution' },
  ])
  assert.deepEqual(result, [])
})

test('alert 未満のステータス間の遷移は通知しない', () => {
  const previous = new Map([['div-1', 'good' as const]])
  const result = detectAlertTransitions(previous, [
    { division_id: 'div-1', composite_score: 60, status: 'caution' },
  ])
  assert.deepEqual(result, [])
})

test('newRecords が空なら空配列を返す', () => {
  const result = detectAlertTransitions(new Map([['div-1', 'caution' as const]]), [])
  assert.deepEqual(result, [])
})

test('複数部署が混在する場合は該当部署のみ抽出する', () => {
  const previous = new Map([
    ['div-1', 'caution' as const],
    ['div-2', 'alert' as const],
    ['div-3', 'good' as const],
  ])
  const result = detectAlertTransitions(previous, [
    { division_id: 'div-1', composite_score: 40, status: 'alert' }, // 遷移
    { division_id: 'div-2', composite_score: 15, status: 'alert' }, // 継続、対象外
    { division_id: 'div-3', composite_score: 80, status: 'good' }, // 対象外
    { division_id: 'div-4', composite_score: 10, status: 'alert' }, // 初回、対象
  ])
  assert.deepEqual(result, [
    { division_id: 'div-1', composite_score: 40, previous_status: 'caution' },
    { division_id: 'div-4', composite_score: 10, previous_status: 'none' },
  ])
})

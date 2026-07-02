import assert from 'node:assert/strict'
import test from 'node:test'

import { detectHighRiskTransitions } from './transition-detector'

test('初回計算でいきなり high になった場合は通知対象（previous_risk_level: none）', () => {
  const result = detectHighRiskTransitions(new Map(), [
    { employee_id: 'emp-1', risk_score: 65, risk_level: 'high' },
  ])
  assert.deepEqual(result, [{ employee_id: 'emp-1', risk_score: 65, previous_risk_level: 'none' }])
})

test('medium から high への遷移は通知対象', () => {
  const previous = new Map([['emp-1', 'medium' as const]])
  const result = detectHighRiskTransitions(previous, [
    { employee_id: 'emp-1', risk_score: 62, risk_level: 'high' },
  ])
  assert.deepEqual(result, [
    { employee_id: 'emp-1', risk_score: 62, previous_risk_level: 'medium' },
  ])
})

test('low から high への遷移は通知対象', () => {
  const previous = new Map([['emp-1', 'low' as const]])
  const result = detectHighRiskTransitions(previous, [
    { employee_id: 'emp-1', risk_score: 70, risk_level: 'high' },
  ])
  assert.deepEqual(result, [{ employee_id: 'emp-1', risk_score: 70, previous_risk_level: 'low' }])
})

test('high が継続している場合は再通知しない', () => {
  const previous = new Map([['emp-1', 'high' as const]])
  const result = detectHighRiskTransitions(previous, [
    { employee_id: 'emp-1', risk_score: 80, risk_level: 'high' },
  ])
  assert.deepEqual(result, [])
})

test('high から回復した場合は通知しない', () => {
  const previous = new Map([['emp-1', 'high' as const]])
  const result = detectHighRiskTransitions(previous, [
    { employee_id: 'emp-1', risk_score: 40, risk_level: 'medium' },
  ])
  assert.deepEqual(result, [])
})

test('high 未満のレベル間の遷移は通知しない', () => {
  const previous = new Map([['emp-1', 'low' as const]])
  const result = detectHighRiskTransitions(previous, [
    { employee_id: 'emp-1', risk_score: 35, risk_level: 'medium' },
  ])
  assert.deepEqual(result, [])
})

test('newRecords が空なら空配列を返す', () => {
  const result = detectHighRiskTransitions(new Map([['emp-1', 'medium' as const]]), [])
  assert.deepEqual(result, [])
})

test('複数従業員が混在する場合は該当者のみ抽出する', () => {
  const previous = new Map([
    ['emp-1', 'medium' as const],
    ['emp-2', 'high' as const],
    ['emp-3', 'low' as const],
  ])
  const result = detectHighRiskTransitions(previous, [
    { employee_id: 'emp-1', risk_score: 61, risk_level: 'high' }, // 遷移
    { employee_id: 'emp-2', risk_score: 85, risk_level: 'high' }, // 継続、対象外
    { employee_id: 'emp-3', risk_score: 20, risk_level: 'low' }, // 対象外
    { employee_id: 'emp-4', risk_score: 90, risk_level: 'high' }, // 初回、対象
  ])
  assert.deepEqual(result, [
    { employee_id: 'emp-1', risk_score: 61, previous_risk_level: 'medium' },
    { employee_id: 'emp-4', risk_score: 90, previous_risk_level: 'none' },
  ])
})

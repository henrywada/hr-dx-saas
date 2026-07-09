import assert from 'node:assert/strict'
import test from 'node:test'

import { selectTemplatesForDisplay } from './template-select'
import type { QuestionTemplate } from './types'

function makeTemplate(overrides: Partial<QuestionTemplate>): QuestionTemplate {
  return {
    id: 't-1',
    tenant_id: null,
    mode: 'general',
    question_text: '質問',
    source: 'seed',
    usage_count: 0,
    status: 'active',
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

test('mined テンプレートを seed より優先して返す', () => {
  const templates = [
    makeTemplate({ id: 's1', source: 'seed', question_text: 'seed質問', usage_count: 100 }),
    makeTemplate({ id: 'm1', source: 'mined', question_text: 'mined質問', usage_count: 1 }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['m1', 's1']
  )
})

test('同一 source 内は usage_count 降順で並べる', () => {
  const templates = [
    makeTemplate({ id: 'a', question_text: 'A', usage_count: 1 }),
    makeTemplate({ id: 'b', question_text: 'B', usage_count: 5 }),
    makeTemplate({ id: 'c', question_text: 'C', usage_count: 3 }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['b', 'c', 'a']
  )
})

test('指定モード以外と archived を除外する', () => {
  const templates = [
    makeTemplate({ id: 'g1', mode: 'general', question_text: 'G' }),
    makeTemplate({ id: 'l1', mode: 'labor_calc', question_text: 'L' }),
    makeTemplate({ id: 'g2', mode: 'general', question_text: 'G2', status: 'archived' }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['g1']
  )
})

test('question_text が重複する場合は先勝ちで排除する', () => {
  const templates = [
    makeTemplate({ id: 'm1', source: 'mined', question_text: '同じ質問' }),
    makeTemplate({ id: 's1', source: 'seed', question_text: '同じ質問' }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['m1']
  )
})

test('limit 件数（デフォルト 6）に切り詰める', () => {
  const templates = Array.from({ length: 10 }, (_, i) =>
    makeTemplate({ id: `t${i}`, question_text: `質問${i}` })
  )
  assert.equal(selectTemplatesForDisplay(templates, 'general').length, 6)
  assert.equal(selectTemplatesForDisplay(templates, 'general', 3).length, 3)
})

test('入力配列を変更しない（イミュータブル）', () => {
  const templates = [
    makeTemplate({ id: 'a', question_text: 'A', usage_count: 1 }),
    makeTemplate({ id: 'b', question_text: 'B', usage_count: 5 }),
  ]
  const before = templates.map(t => t.id)
  selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    templates.map(t => t.id),
    before
  )
})

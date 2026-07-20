import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSystemPrompt } from './prompts'

test('未確定の検討状況は根拠付きで紹介し、完全に無関係な場合のみ記載なしと答えるよう指示する', () => {
  const prompt = buildSystemPrompt('general', false, true)

  assert.ok(prompt.includes('現時点では未確定である'))
  assert.ok(prompt.includes('出典とともに紹介'))
  assert.ok(prompt.includes('質問と関連する記載が一切ない場合のみ'))
  assert.ok(prompt.includes('登録された資料には記載がありません'))
})

test('参照資料が一切ない場合は一般的な労働法令知識で回答するよう指示する', () => {
  const prompt = buildSystemPrompt('general', false, false)

  assert.ok(prompt.includes('参照資料は登録されていません'))
  assert.ok(!prompt.includes('登録された資料には記載がありません'))
})

test('社内資料のみ存在する場合は法令情報特有の出典明記指示を含めない', () => {
  const prompt = buildSystemPrompt('labor_calc', true, false)

  assert.ok(prompt.includes('社内資料'))
  assert.ok(!prompt.includes('取得日と出典URLを明記'))
})

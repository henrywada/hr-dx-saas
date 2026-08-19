import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  SUMMARY_MAX_TOKENS,
} from './summarize-prompt'
import type { ResearchDocument } from '../types'

function makeDoc(overrides: Partial<ResearchDocument> = {}): ResearchDocument {
  return {
    title: '労働基準法 第36条（時間外及び休日の労働）',
    identifier: '第36条',
    body: '使用者は、当該事業場に、労働者の過半数で組織する労働組合がある場合においては…',
    sourceUrl: 'https://laws.e-gov.go.jp/law/322AC0000000049',
    fetchedAt: '2026-08-18T09:00:00.000Z',
    ...overrides,
  }
}

test('SUMMARY_MAX_TOKENS: thinking で食い潰されないよう既定の2000より大きい', () => {
  assert.ok(SUMMARY_MAX_TOKENS > 2000)
})

test('buildSummarySystemPrompt: 原文のみを根拠にする制約を含む', () => {
  const p = buildSummarySystemPrompt()
  assert.match(p, /原文/)
  assert.match(p, /原文に無いこと/)
  assert.match(p, /原文からは判断できません/)
  assert.match(p, /条番号/)
})

test('buildSummarySystemPrompt: 検索や推測を禁じている', () => {
  const p = buildSummarySystemPrompt()
  assert.match(p, /検索/)
  assert.match(p, /推測/)
})

test('buildSummaryUserPrompt: タイトル・出典・取得日時・本文をすべて含む', () => {
  const prompt = buildSummaryUserPrompt(makeDoc())
  assert.match(prompt, /労働基準法 第36条/)
  assert.match(prompt, /https:\/\/laws\.e-gov\.go\.jp\/law\/322AC0000000049/)
  assert.match(prompt, /2026-08-18/)
  assert.match(prompt, /労働者の過半数で組織する労働組合/)
})

test('buildSummaryUserPrompt: 極端に長い本文は打ち切られる', () => {
  const prompt = buildSummaryUserPrompt(makeDoc({ body: 'あ'.repeat(50000) }))
  assert.ok(prompt.length < 40000)
  assert.match(prompt, /以下略/)
})

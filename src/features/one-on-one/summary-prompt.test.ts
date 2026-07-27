import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOneOnOneSummaryPrompt, type OneOnOneSummaryPromptInput } from './summary-prompt'

const baseInput: OneOnOneSummaryPromptInput = {
  theme: 'キャリアについて',
  conductedLabel: '2026/7/27 10:00:00',
  notes: '来期は新しい領域に挑戦したいとのこと。',
}

test('テーマ・実施日・記録本文がプロンプトに含まれる', () => {
  const prompt = buildOneOnOneSummaryPrompt(baseInput)

  assert.match(prompt, /キャリアについて/)
  assert.match(prompt, /2026\/7\/27 10:00:00/)
  assert.match(prompt, /来期は新しい領域に挑戦したいとのこと。/)
})

test('個人を識別する項目ラベルをプロンプトに含めない', () => {
  const prompt = buildOneOnOneSummaryPrompt(baseInput)

  // 外部 LLM へ氏名を送らない方針の回帰防止（部下:／氏名:／社員番号: 等を置かない）
  assert.doesNotMatch(prompt, /部下\s*[:：]/)
  assert.doesNotMatch(prompt, /氏名\s*[:：]/)
  assert.doesNotMatch(prompt, /名前\s*[:：]/)
  assert.doesNotMatch(prompt, /社員番号\s*[:：]/)
  assert.doesNotMatch(prompt, /employee_id/i)
})

test('入力に無い値はプロンプトへ混入しない', () => {
  const prompt = buildOneOnOneSummaryPrompt(baseInput)

  // 呼び出し側が誤って氏名を渡せない構造であることの確認。
  // baseInput に含まれない従業員名が出力に現れないこと。
  assert.doesNotMatch(prompt, /山田太郎/)
})

test('theme が null でも例外にならず空欄として扱う', () => {
  const prompt = buildOneOnOneSummaryPrompt({ ...baseInput, theme: null })

  assert.match(prompt, /テーマ: \n/)
  assert.match(prompt, /来期は新しい領域に挑戦したいとのこと。/)
})

test('記録本文が改行を含んでも保持される', () => {
  const notes = '1行目\n2行目\n3行目'
  const prompt = buildOneOnOneSummaryPrompt({ ...baseInput, notes })

  assert.ok(prompt.endsWith(notes))
})

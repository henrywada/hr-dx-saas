import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyConfidenceDowngrade,
  buildMatchPrompt,
  parseMatchResult,
  CONFIDENCE_THRESHOLD,
} from '@/features/grant-notifier/batch/match/match-prompt'
import type { CandidateGrant, MatchResult, TenantCondition } from '@/features/grant-notifier/types'

const GRANT: CandidateGrant = {
  id: 'g-1',
  title: 'キャリアアップ助成金',
  issuer: '国',
  targetArea: '全国',
  summary: '非正規雇用の処遇改善',
  detailText: '有期雇用労働者を正社員化した事業主に助成。',
  maxAmount: 570000,
  industry: null,
  targetEmployees: '制約なし',
  acceptanceEndAt: '2027-03-31T14:59:00.000Z',
  externalUrl: 'https://example.com/a',
}

const CONDITION: TenantCondition = {
  tenantId: 't-1',
  industries: ['製造業'],
  employeeCount: 300,
  capital: 50000000,
  prefectures: ['長野県'],
  categories: ['雇用'],
  keywords: '正社員化',
  notifyEmails: ['hr@example.com'],
  deliveryFrequency: 'weekly',
}

const BASE_RESULT: MatchResult = {
  verdict: '適合',
  confidence: 0.9,
  reasons: [],
  matchedConditions: [],
  unclearPoints: [],
}

test('buildMatchPrompt はテナント条件と助成金の項目を含む', () => {
  const prompt = buildMatchPrompt(GRANT, CONDITION)

  assert.ok(prompt.includes('製造業'))
  assert.ok(prompt.includes('長野県'))
  assert.ok(prompt.includes('キャリアアップ助成金'))
  assert.ok(prompt.includes('正社員化'))
  assert.ok(prompt.includes('{"verdict"'))
})

test('buildMatchPrompt は長すぎる本文を切り詰める', () => {
  const long = 'あ'.repeat(5000)
  const prompt = buildMatchPrompt({ ...GRANT, detailText: long }, CONDITION)

  assert.ok(prompt.includes('…'))
  assert.ok(prompt.length < long.length + 1500)
})

test('parseMatchResult は素の JSON をパースする', () => {
  const result = parseMatchResult(
    '{"verdict":"適合","confidence":0.9,"reasons":["雇用カテゴリに一致"],"matched_conditions":["雇用"],"unclear_points":[]}'
  )

  assert.deepEqual(result, {
    verdict: '適合',
    confidence: 0.9,
    reasons: ['雇用カテゴリに一致'],
    matchedConditions: ['雇用'],
    unclearPoints: [],
  })
})

test('parseMatchResult は説明文やコードフェンスに埋もれた JSON を取り出す', () => {
  const text =
    'はい、判定します。\n```json\n{"verdict":"要確認","confidence":0.6,"reasons":["業種が不明"],"matched_conditions":[],"unclear_points":["対象業種"]}\n```\n以上です。'

  const result = parseMatchResult(text)

  assert.equal(result.verdict, '要確認')
  assert.deepEqual(result.unclearPoints, ['対象業種'])
})

test('parseMatchResult は省略された配列項目を空配列で補う', () => {
  const result = parseMatchResult('{"verdict":"不適合","confidence":0.95}')

  assert.deepEqual(result.reasons, [])
  assert.deepEqual(result.matchedConditions, [])
  assert.deepEqual(result.unclearPoints, [])
})

test('parseMatchResult は JSON が無ければ例外を投げる', () => {
  assert.throws(() => parseMatchResult('判定できませんでした'), /JSON/)
})

test('parseMatchResult は範囲外の confidence で例外を投げる', () => {
  assert.throws(() => parseMatchResult('{"verdict":"適合","confidence":1.5}'))
})

test('confidence が閾値未満の「適合」は「要確認」へ降格する', () => {
  assert.equal(applyConfidenceDowngrade({ ...BASE_RESULT, confidence: 0.5 }).verdict, '要確認')
})

test('confidence が閾値以上の「適合」はそのまま維持する', () => {
  assert.equal(
    applyConfidenceDowngrade({ ...BASE_RESULT, confidence: CONFIDENCE_THRESHOLD }).verdict,
    '適合'
  )
})

test('「不適合」「要確認」は confidence に関わらず変更しない', () => {
  assert.equal(
    applyConfidenceDowngrade({ ...BASE_RESULT, verdict: '不適合', confidence: 0.1 }).verdict,
    '不適合'
  )
  assert.equal(
    applyConfidenceDowngrade({ ...BASE_RESULT, verdict: '要確認', confidence: 0.1 }).verdict,
    '要確認'
  )
})

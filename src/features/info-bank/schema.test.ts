import assert from 'node:assert/strict'
import test from 'node:test'

import { documentMetaSchema } from './schema'

const base = { title: '就業規則' }

test('タイトルだけ指定すれば他は既定値になる', () => {
  const r = documentMetaSchema.parse(base)
  assert.equal(r.category, 'その他')
  assert.deepEqual(r.tags, [])
  assert.deepEqual(r.keywords, [])
  assert.equal(r.summary, '')
})

test('タグ・キーワードは前後の空白を除き、空と重複を取り除く', () => {
  const r = documentMetaSchema.parse({
    ...base,
    tags: [' 休暇 ', '休暇', '', '  ', '規程'],
    keywords: ['育休', ' 育休 ', '育児休業'],
  })
  assert.deepEqual(r.tags, ['休暇', '規程'])
  assert.deepEqual(r.keywords, ['育休', '育児休業'])
})

test('タイトルが空白だけなら拒否する', () => {
  assert.equal(documentMetaSchema.safeParse({ title: '   ' }).success, false)
})

test('タイトルは 200 文字まで', () => {
  assert.equal(documentMetaSchema.safeParse({ title: 'あ'.repeat(200) }).success, true)
  assert.equal(documentMetaSchema.safeParse({ title: 'あ'.repeat(201) }).success, false)
})

test('タグは 20 件まで', () => {
  const tags = Array.from({ length: 21 }, (_, i) => `t${i}`)
  assert.equal(documentMetaSchema.safeParse({ ...base, tags }).success, false)
})

test('タグ 1 件は 40 文字まで', () => {
  assert.equal(documentMetaSchema.safeParse({ ...base, tags: ['あ'.repeat(41)] }).success, false)
})

test('固定の選択肢にないカテゴリは拒否する', () => {
  assert.equal(documentMetaSchema.safeParse({ ...base, category: '極秘' }).success, false)
})

test('要約は 1000 文字まで', () => {
  assert.equal(documentMetaSchema.safeParse({ ...base, summary: 'あ'.repeat(1001) }).success, false)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { detectLawArticleReferences } from './egov-law-detect'

test('「法令名+第◯条」形式を検出する', () => {
  const refs = detectLawArticleReferences('労働基準法第32条の内容を教えてください')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].lawName, '労働基準法')
  assert.equal(refs[0].lawId, '322AC0000000049')
  assert.equal(refs[0].article, '32')
  assert.equal(refs[0].paragraph, undefined)
  assert.equal(refs[0].item, undefined)
})

test('法令名と条文番号の間に空白がある形式も検出する', () => {
  const refs = detectLawArticleReferences('労働基準法 第32条について教えて')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].article, '32')
})

test('法令名と条文番号の間に読点がある形式も検出する', () => {
  const refs = detectLawArticleReferences('労基法、第36条の解釈は？')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].article, '36')
})

test('略称+「の」+「第◯条」形式を検出する', () => {
  const refs = detectLawArticleReferences('安衛法の第59条を見せて')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].lawName, '労働安全衛生法')
  assert.equal(refs[0].article, '59')
})

test('「条」の枝番号（の2）を検出する', () => {
  const refs = detectLawArticleReferences('育介法9条の2について教えて')
  assert.equal(refs.length, 1)
  assert.equal(
    refs[0].lawName,
    '育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律'
  )
  assert.equal(refs[0].article, '9_2')
})

test('多段の枝番号（の2の3）を検出する', () => {
  const refs = detectLawArticleReferences('労働基準法施行規則第24条の2の3について教えて')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].article, '24_2_3')
})

test('項・号まで指定された場合は数値として抽出する', () => {
  const refs = detectLawArticleReferences('労基法第36条第1項第2号の解釈は？')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].article, '36')
  assert.equal(refs[0].paragraph, 1)
  assert.equal(refs[0].item, 2)
})

test('接続語（第・の）が無い「法令名+数字+条」形式も検出する', () => {
  const refs = detectLawArticleReferences('労基法36条について')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].article, '36')
})

test('条文番号を伴わない法令名の言及は検出しない（一般質問との誤爆防止）', () => {
  const refs = detectLawArticleReferences('労働基準法について教えてください')
  assert.equal(refs.length, 0)
})

test('法令名の言及が無い一般的な質問は検出しない', () => {
  const refs = detectLawArticleReferences('有給休暇の付与日数を教えてください')
  assert.equal(refs.length, 0)
})

test('未知の法令名+条文番号は検出しない（レジストリ未登録）', () => {
  const refs = detectLawArticleReferences('存在しない法律第1条について')
  assert.equal(refs.length, 0)
})

test('複数の異なる条文参照を重複なく検出する', () => {
  const refs = detectLawArticleReferences('派遣法30条と労働者派遣法36条の違いは？')
  assert.equal(refs.length, 2)
  const articles = refs.map(r => r.article).sort()
  assert.deepEqual(articles, ['30', '36'])
})

test('同一条文への重複言及は1件にまとめる', () => {
  const refs = detectLawArticleReferences(
    '労基法32条は重要です。労働基準法32条を再確認しましょう。'
  )
  assert.equal(refs.length, 1)
})

test('検出件数には上限がある', () => {
  const question = '労基法1条、労基法2条、労基法3条、労基法4条、労基法5条について教えてください'
  const refs = detectLawArticleReferences(question)
  assert.ok(refs.length <= 3)
})

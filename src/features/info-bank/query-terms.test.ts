import assert from 'node:assert/strict'
import test from 'node:test'

import { extractQueryTerms } from './query-terms'

test('助詞と疑問表現を除いて漢字の語を取り出す', () => {
  assert.deepEqual(extractQueryTerms('育休の申請方法は？'), ['育休', '申請方法'])
})

test('ひらがなだけの質問は正規化後の全文を 1 語として返す', () => {
  assert.deepEqual(extractQueryTerms('ねんきんは？'), ['ねんきんは'])
})

test('カタカナ・英数字の連続を語として扱う', () => {
  assert.deepEqual(extractQueryTerms('VPN接続のマニュアル'), ['VPN接続', 'マニュアル'])
})

test('全角英数字を半角に統一する', () => {
  assert.deepEqual(extractQueryTerms('ＶＰＮ設定'), ['VPN設定'])
})

test('語は最大 8 件までで重複しない', () => {
  const q = ['規程', '手順', '申請', '承認', '休暇', '給与', '賞与', '勤怠', '残業', '規程'].join(
    'と'
  )
  const terms = extractQueryTerms(q)
  assert.equal(terms.length, 8)
  assert.equal(new Set(terms).size, terms.length)
})

test('空文字や記号のみは空配列を返す', () => {
  assert.deepEqual(extractQueryTerms('   '), [])
  assert.deepEqual(extractQueryTerms('？！'), [])
})

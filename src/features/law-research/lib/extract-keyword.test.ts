import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractKeywordCandidates,
  extractLawTitleKeywords,
  extractSearchKeyword,
} from './extract-keyword'

test('条文番号のない業務質問から検索語を取り出す', () => {
  assert.equal(extractSearchKeyword('この経費は損金算入できる？'), '経費 損金算入')
  assert.equal(extractSearchKeyword('ストレスチェックは誰が実施する？'), 'ストレスチェック 実施')
  assert.equal(extractSearchKeyword('36協定の残業上限は何時間？'), '36協定 残業上限')
  assert.equal(extractSearchKeyword('出張手当は課税される？'), '出張手当 課税')
})

test('短いキーワードはそのまま返す', () => {
  assert.equal(extractSearchKeyword('ストレスチェック'), 'ストレスチェック')
  assert.equal(extractSearchKeyword('交際費'), '交際費')
})

test('空白のみは空文字を返す', () => {
  assert.equal(extractSearchKeyword('   '), '')
  assert.equal(extractSearchKeyword(''), '')
})

test('法令名検索用の語は法令タイトルに載る語だけを残す', () => {
  assert.deepEqual(extractLawTitleKeywords('個人情報を社内で共有してよいか'), ['個人情報'])
  assert.deepEqual(extractLawTitleKeywords('育児休業の対象者は誰か'), ['育児休業'])
  assert.deepEqual(extractLawTitleKeywords('契約社員の雇止めはできるか'), ['労働契約'])
})

test('税法・労務の質問はAPIが当たる代表語に落とす', () => {
  assert.equal(extractKeywordCandidates('この経費は損金算入できる？')[0], '損金')
  assert.equal(extractKeywordCandidates('出張手当は課税される？')[0], '旅費')
  assert.equal(extractKeywordCandidates('通勤手当の非課税限度額は？')[0], '通勤手当')
  assert.equal(extractKeywordCandidates('退職金の税金はどう計算する？')[0], '退職金')
  assert.equal(extractKeywordCandidates('ストレスチェックは誰が実施する？')[0], 'ストレスチェック')
  assert.equal(extractKeywordCandidates('36協定の残業上限は何時間？')[0], '36協定')
  assert.equal(extractKeywordCandidates('有給休暇はいつまでに取らせる？')[0], '有給休暇')
  assert.equal(extractKeywordCandidates('産休中の社会保険料はどうなる？')[0], '産前産後')
})

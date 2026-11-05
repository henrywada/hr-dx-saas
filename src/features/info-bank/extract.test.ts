import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'

import { INFO_BANK_MAX_TEXT_CHARS } from './constants'
import { decodeTextBuffer, extractInfoBankText } from './extract'

// Shift_JIS で「氏名,部署\n山田,総務」を表すバイト列
const SJIS_CSV = Buffer.from([
  0x8e, 0x81, 0x96, 0xbc, 0x2c, 0x95, 0x94, 0x8f, 0x90, 0x0a, 0x8e, 0x52, 0x93, 0x63, 0x2c, 0x91,
  0x8d, 0x96, 0xb1,
])

test('UTF-8 のテキストはそのまま復号する', () => {
  assert.equal(decodeTextBuffer(Buffer.from('就業規則', 'utf8')), '就業規則')
})

test('UTF-8 BOM を取り除く', () => {
  const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('氏名', 'utf8')])
  assert.equal(decodeTextBuffer(buf), '氏名')
})

test('Shift_JIS の CSV を文字化けさせずに復号する', () => {
  const text = decodeTextBuffer(SJIS_CSV)
  assert.ok(text.includes('山田'), `復号結果: ${text}`)
  assert.ok(text.includes('総務'))
})

test('Shift_JIS の CSV を取り込むと本文に山田が含まれる', async () => {
  const text = await extractInfoBankText(SJIS_CSV, 'text/csv', 'staff.csv')
  assert.ok(text.includes('山田'), `抽出結果: ${text}`)
})

test('PDF からテキストが取れなければスキャン画像の可能性を示して失敗する', async () => {
  await assert.rejects(
    () =>
      extractInfoBankText(Buffer.from('%PDF'), 'application/pdf', 'scan.pdf', {
        extract: async () => '   ',
      }),
    /スキャン/
  )
})

test('抽出した文字数が上限を超えたら失敗にする（巨大ファイル・展開爆弾対策）', async () => {
  await assert.rejects(
    () =>
      extractInfoBankText(Buffer.from('x'), 'text/plain', 'big.txt', {
        extract: async () => 'あ'.repeat(INFO_BANK_MAX_TEXT_CHARS + 1),
      }),
    /大きすぎ/
  )
})

test('抽出が例外を投げたらそのメッセージを伝える', async () => {
  await assert.rejects(
    () =>
      extractInfoBankText(Buffer.from('x'), 'application/pdf', 'locked.pdf', {
        extract: async () => {
          throw new Error('パスワードが必要です')
        },
      }),
    /パスワード/
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { createSubjectSchema, sendPictureSchema } from './types'

// actions.ts本体はgetServerUser/createClientというサーバー専用モジュールに
// 依存しているため、Node単体テストではモック困難。ここではactions.tsが
// 権限チェック前に必ず通すバリデーションスキーマの妥当性のみを検証する。
// 実際のis_manager分岐・RLS境界はTask 1 Step 3の手動SQL確認とTask 9の
// E2E手動確認でカバーする。

test('件名作成: ラベルが100文字を超えると拒否される', () => {
  const result = createSubjectSchema.safeParse({ label: 'a'.repeat(101) })
  assert.equal(result.success, false)
})

test('画像送信: 本文が2000文字以内なら成功する', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '日報',
    bodyText: 'a'.repeat(2000),
    priority: 'low',
  })
  assert.equal(result.success, true)
})

test('画像送信: 本文が2000文字を超えると拒否される', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '日報',
    bodyText: 'a'.repeat(2001),
    priority: 'low',
  })
  assert.equal(result.success, false)
})

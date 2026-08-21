import assert from 'node:assert/strict'
import test from 'node:test'
import { publishStatusPreview } from './publish-status-preview'

// datetime-local 形式（秒無し）。未来日・過去日は十分に離した値を使う
const FAR_FUTURE = '2999-01-01T00:00'
const FAR_PAST = '2000-01-01T00:00'

test('公開日時が空文字なら空文字を返す', () => {
  assert.equal(publishStatusPreview('', ''), '')
})

test('公開日時が未来なら「公開されます」文言になる', () => {
  const result = publishStatusPreview(FAR_FUTURE, '')
  assert.match(result, /に公開されます/)
})

test('公開日時が過去なら「公開中」文言になる', () => {
  const result = publishStatusPreview(FAR_PAST, '')
  assert.match(result, /^現在公開中です/)
})

test('掲載期限ありで公開中なら期限も文言に含む', () => {
  const result = publishStatusPreview(FAR_PAST, FAR_FUTURE)
  assert.match(result, /現在公開中です。.*に掲載終了します。/)
})

test('掲載期限ありで公開前なら公開予定と期限の両方を含む', () => {
  const result = publishStatusPreview(FAR_FUTURE, '2999-06-01T00:00')
  assert.match(result, /に公開され、.*に掲載終了します。/)
})

test('掲載期限が公開日時以前（同時刻）なら警告文言になる', () => {
  const result = publishStatusPreview(FAR_FUTURE, FAR_FUTURE)
  assert.match(result, /^⚠/)
})

test('掲載期限が公開日時より前なら警告文言になる', () => {
  const result = publishStatusPreview(FAR_FUTURE, FAR_PAST)
  assert.match(result, /^⚠/)
})

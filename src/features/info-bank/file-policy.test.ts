import assert from 'node:assert/strict'
import test from 'node:test'

import { validateUpload } from './file-policy'
import { INFO_BANK_MAX_FILE_BYTES } from './constants'

test('50MB を超えるファイルは拒否する', () => {
  const r = validateUpload({
    name: 'big.pdf',
    size: INFO_BANK_MAX_FILE_BYTES + 1,
    mime: 'application/pdf',
  })
  assert.equal(r.ok, false)
})

test('50MB ちょうどは受け付ける', () => {
  const r = validateUpload({
    name: 'edge.pdf',
    size: INFO_BANK_MAX_FILE_BYTES,
    mime: 'application/pdf',
  })
  assert.equal(r.ok, true)
})

test('空ファイルは拒否する', () => {
  const r = validateUpload({ name: 'a.txt', size: 0, mime: 'text/plain' })
  assert.equal(r.ok, false)
})

test('.doc は docx への変換を案内して拒否する', () => {
  const r = validateUpload({ name: 'old.doc', size: 10, mime: 'application/msword' })
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.error, /docx/)
})

test('.gdoc ポインタファイルは書き出し手順を案内して拒否する', () => {
  const r = validateUpload({ name: 'memo.gdoc', size: 120, mime: 'application/octet-stream' })
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.error, /ダウンロード/)
})

test('MIME が octet-stream でも拡張子から xlsx を判定する', () => {
  const r = validateUpload({ name: 'a.xlsx', size: 10, mime: 'application/octet-stream' })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }
})

test('未対応の拡張子は拒否する', () => {
  const r = validateUpload({ name: 'a.exe', size: 10, mime: 'application/octet-stream' })
  assert.equal(r.ok, false)
})

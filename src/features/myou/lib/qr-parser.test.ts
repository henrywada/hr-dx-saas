import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildQrPayload,
  buildSerialNumber,
  extractSerialSequence,
  parseQrContent,
} from './qr-parser'

test('標準形式のQRペイロードからシリアル番号と有効期限を取り出せる', () => {
  const result = parseQrContent('SERIAL:MS-20260707-0001,EXP:2026-12-31')
  assert.equal(result.serial, 'MS-20260707-0001')
  assert.equal(result.expiration, '2026-12-31')
})

test('キーの大文字小文字と空白を許容する', () => {
  const result = parseQrContent(' serial : ABC-123 , exp : 2027-01-15 ')
  assert.equal(result.serial, 'ABC-123')
  assert.equal(result.expiration, '2027-01-15')
})

test('EXPが無い場合は有効期限が空文字になる', () => {
  const result = parseQrContent('SERIAL:MS-20260707-0002')
  assert.equal(result.serial, 'MS-20260707-0002')
  assert.equal(result.expiration, '')
})

test('形式に合わないテキストは全文をシリアル番号として扱う', () => {
  const result = parseQrContent('PLAIN-SERIAL-999')
  assert.equal(result.serial, 'PLAIN-SERIAL-999')
  assert.equal(result.expiration, '')
})

test('buildQrPayload は parseQrContent と往復できる', () => {
  const payload = buildQrPayload('MS-20260707-0003', '2026-12-31')
  const result = parseQrContent(payload)
  assert.equal(result.serial, 'MS-20260707-0003')
  assert.equal(result.expiration, '2026-12-31')
})

test('buildSerialNumber は MS-YYYYMMDD-NNNN 形式で採番する', () => {
  assert.equal(buildSerialNumber('2026-07-07', 1), 'MS-20260707-0001')
  assert.equal(buildSerialNumber('2026-07-07', 42), 'MS-20260707-0042')
  assert.equal(buildSerialNumber('2026-12-01', 10000), 'MS-20261201-10000')
})

test('extractSerialSequence は当日シリアルから通番を取り出す', () => {
  assert.equal(extractSerialSequence('MS-20260707-0007', '2026-07-07'), 7)
  assert.equal(extractSerialSequence('MS-20260707-9999', '2026-07-07'), 9999)
})

test('extractSerialSequence は別日・別形式のシリアルには null を返す', () => {
  assert.equal(extractSerialSequence('MS-20260706-0001', '2026-07-07'), null)
  assert.equal(extractSerialSequence('TEST-1234', '2026-07-07'), null)
  assert.equal(extractSerialSequence('', '2026-07-07'), null)
})

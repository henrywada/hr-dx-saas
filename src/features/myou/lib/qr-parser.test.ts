import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildQrPayload,
  buildSerialNumber,
  buildTraceNo,
  buildTraceQrPayload,
  extractSerialSequence,
  extractTraceSequence,
  getMaxSerialSequence,
  getMaxTraceSequence,
  parseQrContent,
  parseSerialNumber,
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

test('getMaxSerialSequence は数値比較で最大通番を返す（5桁通番の辞書順の罠を回避）', () => {
  // 文字列の辞書順では 'MS-20260707-9999' > 'MS-20260707-10000' となるが、数値では 10000 が最大
  const serials = ['MS-20260707-9999', 'MS-20260707-10000', 'MS-20260707-0001']
  assert.equal(getMaxSerialSequence(serials, '2026-07-07'), 10000)
})

test('getMaxSerialSequence は別日・別形式のシリアルを無視する', () => {
  const serials = ['MS-20260706-5000', 'TEST-1234', 'MS-20260707-0003']
  assert.equal(getMaxSerialSequence(serials, '2026-07-07'), 3)
})

test('getMaxSerialSequence は該当なしのとき 0 を返す', () => {
  assert.equal(getMaxSerialSequence([], '2026-07-07'), 0)
  assert.equal(getMaxSerialSequence(['MS-20260706-0001'], '2026-07-07'), 0)
})

test('buildTraceNo は YYYYMMDD-NNNN 形式（4桁ゼロ埋め）を生成する', () => {
  assert.equal(buildTraceNo('2026-07-18', 1), '20260718-0001')
  assert.equal(buildTraceNo('2026-07-18', 42), '20260718-0042')
})

test('extractTraceSequence は当日分のTraceNoから通番を取り出す', () => {
  assert.equal(extractTraceSequence('20260718-0007', '2026-07-18'), 7)
})

test('extractTraceSequence は日付が異なるTraceNoに対してnullを返す', () => {
  assert.equal(extractTraceSequence('20260717-0007', '2026-07-18'), null)
})

test('extractTraceSequence は形式に合わないTraceNoに対してnullを返す', () => {
  assert.equal(extractTraceSequence('INVALID', '2026-07-18'), null)
})

test('getMaxTraceSequence は当日分の最大通番を返す（該当なしは0）', () => {
  const traceNos = ['20260718-0001', '20260718-0005', '20260717-0099']
  assert.equal(getMaxTraceSequence(traceNos, '2026-07-18'), 5)
  assert.equal(getMaxTraceSequence([], '2026-07-18'), 0)
})

test('buildTraceQrPayload は SERIAL/EXP/ShipTo/TraceNo を含むペイロードを組み立てる', () => {
  const payload = buildTraceQrPayload('MS-20260707-0001', '2026-12-31', 3, '20260718-0001')
  assert.equal(payload, 'SERIAL:MS-20260707-0001,EXP:2026-12-31,ShipTo:3,TraceNo:20260718-0001')
})

test('parseSerialNumber は MS-YYYYMMDD-NNNN 形式から発行日と通番を取り出す', () => {
  assert.deepEqual(parseSerialNumber('MS-20260707-0001'), { dateYmd: '2026-07-07', sequence: 1 })
  assert.deepEqual(parseSerialNumber('MS-20261201-10000'), {
    dateYmd: '2026-12-01',
    sequence: 10000,
  })
})

test('parseSerialNumber は形式に合わないシリアルに対してnullを返す', () => {
  assert.equal(parseSerialNumber('TEST-1234'), null)
  assert.equal(parseSerialNumber(''), null)
})

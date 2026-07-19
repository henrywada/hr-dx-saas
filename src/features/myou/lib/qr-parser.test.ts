import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLotNo,
  buildLotQrPayload,
  buildTraceNo,
  buildTraceQrPayload,
  extractLotSequence,
  extractSearchIdentifier,
  extractTraceSequence,
  getMaxLotSequence,
  getMaxTraceSequence,
  parseLotQrContent,
  parseTraceQrContent,
} from './qr-parser'

test('標準形式の製造ロットQRペイロードからロット番号・製造日・有効期限を取り出せる', () => {
  const result = parseLotQrContent('LOT:LOT-20260707-0001,MFG:2026-07-01,EXP:2026-12-31')
  assert.equal(result.lotNo, 'LOT-20260707-0001')
  assert.equal(result.manufacturedDate, '2026-07-01')
  assert.equal(result.expiration, '2026-12-31')
})

test('parseLotQrContent はキーの大文字小文字と空白を許容する', () => {
  const result = parseLotQrContent(' lot : ABC-123 , mfg : 2027-01-01 , exp : 2027-01-15 ')
  assert.equal(result.lotNo, 'ABC-123')
  assert.equal(result.manufacturedDate, '2027-01-01')
  assert.equal(result.expiration, '2027-01-15')
})

test('parseLotQrContent は形式に合わないテキストを全文ロット番号として扱う', () => {
  const result = parseLotQrContent('PLAIN-LOT-999')
  assert.equal(result.lotNo, 'PLAIN-LOT-999')
  assert.equal(result.manufacturedDate, '')
  assert.equal(result.expiration, '')
})

test('buildLotQrPayload は parseLotQrContent と往復できる', () => {
  const payload = buildLotQrPayload('LOT-20260707-0003', '2026-07-01', '2026-12-31')
  const result = parseLotQrContent(payload)
  assert.equal(result.lotNo, 'LOT-20260707-0003')
  assert.equal(result.manufacturedDate, '2026-07-01')
  assert.equal(result.expiration, '2026-12-31')
})

test('buildLotNo は LOT-YYYYMMDD-NNNN 形式で採番する', () => {
  assert.equal(buildLotNo('2026-07-07', 1), 'LOT-20260707-0001')
  assert.equal(buildLotNo('2026-07-07', 42), 'LOT-20260707-0042')
  assert.equal(buildLotNo('2026-12-01', 10000), 'LOT-20261201-10000')
})

test('extractLotSequence は当日ロット番号から通番を取り出す', () => {
  assert.equal(extractLotSequence('LOT-20260707-0007', '2026-07-07'), 7)
  assert.equal(extractLotSequence('LOT-20260707-9999', '2026-07-07'), 9999)
})

test('extractLotSequence は別日・別形式のロット番号には null を返す', () => {
  assert.equal(extractLotSequence('LOT-20260706-0001', '2026-07-07'), null)
  assert.equal(extractLotSequence('TEST-1234', '2026-07-07'), null)
  assert.equal(extractLotSequence('', '2026-07-07'), null)
})

test('getMaxLotSequence は数値比較で最大通番を返す（5桁通番の辞書順の罠を回避）', () => {
  // 文字列の辞書順では 'LOT-20260707-9999' > 'LOT-20260707-10000' となるが、数値では 10000 が最大
  const lotNos = ['LOT-20260707-9999', 'LOT-20260707-10000', 'LOT-20260707-0001']
  assert.equal(getMaxLotSequence(lotNos, '2026-07-07'), 10000)
})

test('getMaxLotSequence は別日・別形式のロット番号を無視する', () => {
  const lotNos = ['LOT-20260706-5000', 'TEST-1234', 'LOT-20260707-0003']
  assert.equal(getMaxLotSequence(lotNos, '2026-07-07'), 3)
})

test('getMaxLotSequence は該当なしのとき 0 を返す', () => {
  assert.equal(getMaxLotSequence([], '2026-07-07'), 0)
  assert.equal(getMaxLotSequence(['LOT-20260706-0001'], '2026-07-07'), 0)
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

test('buildTraceQrPayload は公開ページURL（?traceNo=...付き）を組み立てる', () => {
  const payload = buildTraceQrPayload(
    'https://app.hr-dx.jp',
    '3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e',
    '20260718-0001'
  )
  assert.equal(
    payload,
    'https://app.hr-dx.jp/p/myou/trace/3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e?traceNo=20260718-0001'
  )
})

test('parseTraceQrContent は新形式（公開ページURL）からTraceNoを取り出す', () => {
  const result = parseTraceQrContent(
    'https://app.hr-dx.jp/p/myou/trace/3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e?traceNo=20260718-0001'
  )
  assert.equal(result.traceNo, '20260718-0001')
  assert.equal(result.lotNo, '')
  assert.equal(result.shipToNo, null)
  assert.equal(result.quantity, null)
  assert.equal(result.expiration, '')
})

test('parseTraceQrContent は旧形式（KEY:VALUE）のペイロードから各項目を取り出す（既発行の物理ラベル互換）', () => {
  const result = parseTraceQrContent(
    'LOT:LOT-20260707-0001,ShipTo:3,TraceNo:20260718-0001,QTY:12,EXP:2026-12-31'
  )
  assert.equal(result.lotNo, 'LOT-20260707-0001')
  assert.equal(result.shipToNo, 3)
  assert.equal(result.traceNo, '20260718-0001')
  assert.equal(result.quantity, 12)
  assert.equal(result.expiration, '2026-12-31')
})

test('parseTraceQrContent は欠落フィールドに対して null を返す', () => {
  const result = parseTraceQrContent('LOT:LOT-20260707-0001')
  assert.equal(result.lotNo, 'LOT-20260707-0001')
  assert.equal(result.shipToNo, null)
  assert.equal(result.traceNo, '')
  assert.equal(result.quantity, null)
  assert.equal(result.expiration, '')
})

test('extractSearchIdentifier はトレーサビリティQRからTraceNoを優先して取り出す', () => {
  const id = extractSearchIdentifier(
    'LOT:LOT-20260707-0001,ShipTo:3,TraceNo:20260718-0001,QTY:12,EXP:2026-12-31'
  )
  assert.equal(id, '20260718-0001')
})

test('extractSearchIdentifier は新形式（公開ページURL）からもTraceNoを取り出せる', () => {
  const id = extractSearchIdentifier(
    'https://app.hr-dx.jp/p/myou/trace/3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e?traceNo=20260718-0001'
  )
  assert.equal(id, '20260718-0001')
})

test('extractSearchIdentifier はTraceNoが無ければロット番号を返す', () => {
  const id = extractSearchIdentifier('LOT:LOT-20260707-0001,MFG:2026-07-01,EXP:2026-12-31')
  assert.equal(id, 'LOT-20260707-0001')
})

test('extractSearchIdentifier はいずれも無ければ全文を返す', () => {
  const id = extractSearchIdentifier('PLAIN-TEXT-123')
  assert.equal(id, 'PLAIN-TEXT-123')
})

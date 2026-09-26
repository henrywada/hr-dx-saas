import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTraceExpirationDisplay } from './trace-expiration'

const log = (trace_no: string | null, expiration_date: string | null) => ({ trace_no, expiration_date })

test('TraceNo で照会した場合は、そのTraceNoの出荷の有効期限を返す', () => {
  const history = [log('20260926-0002', '2027-01-31'), log('20260926-0001', '2028-09-26')]
  assert.deepEqual(getTraceExpirationDisplay(history, '20260926-0001'), {
    date: '2028-09-26',
    text: '2028-09-26',
  })
})

test('ロット番号で照会し、出荷の有効期限がすべて同じならその日付を返す', () => {
  const history = [log('20260926-0002', '2028-09-26'), log('20260926-0001', '2028-09-26')]
  assert.deepEqual(getTraceExpirationDisplay(history, '123'), {
    date: '2028-09-26',
    text: '2028-09-26',
  })
})

test('ロット番号で照会し、出荷ごとに有効期限が異なる場合は出荷履歴の参照を促す', () => {
  const history = [log('20260926-0002', '2027-01-31'), log('20260926-0001', '2028-09-26')]
  assert.deepEqual(getTraceExpirationDisplay(history, '123'), {
    date: null,
    text: '出荷ごとに異なります（下の出荷履歴を参照）',
  })
})

test('出荷履歴がない（在庫のみ）場合は、出荷時に設定される旨を返す', () => {
  assert.deepEqual(getTraceExpirationDisplay([], '123'), {
    date: null,
    text: '出荷時に設定されます',
  })
})

test('出荷履歴はあるが有効期限が未入力の場合は「未設定」を返す', () => {
  assert.deepEqual(getTraceExpirationDisplay([log('20260926-0001', null)], '20260926-0001'), {
    date: null,
    text: '未設定',
  })
})

test('前後の空白を無視してTraceNoを照合する', () => {
  const history = [log('20260926-0001', '2028-09-26')]
  assert.equal(getTraceExpirationDisplay(history, ' 20260926-0001 ').date, '2028-09-26')
})

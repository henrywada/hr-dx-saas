import assert from 'node:assert/strict'
import test from 'node:test'

import { INFO_BANK_ASK_LIMIT_PER_MINUTE, INFO_BANK_ASK_WINDOW_SECONDS } from './constants'
import { consumeAskQuota, type QuotaRpc } from './rate-limit'

function rpcReturning(result: { data: boolean | null; error: { message: string } | null }) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = []
  const rpc: QuotaRpc = async (fn, args) => {
    calls.push({ fn, args })
    return result
  }
  return { rpc, calls }
}

test('1 分あたり 5 回が上限', () => {
  assert.equal(INFO_BANK_ASK_LIMIT_PER_MINUTE, 5)
  assert.equal(INFO_BANK_ASK_WINDOW_SECONDS, 60)
})

test('枠が残っていれば許可し、上限値を関数へ渡す', async () => {
  const { rpc, calls } = rpcReturning({ data: true, error: null })
  const r = await consumeAskQuota(rpc)
  assert.deepEqual(r, { ok: true })
  assert.deepEqual(calls, [
    {
      fn: 'try_consume_info_bank_ask',
      args: {
        p_limit: INFO_BANK_ASK_LIMIT_PER_MINUTE,
        p_window_seconds: INFO_BANK_ASK_WINDOW_SECONDS,
      },
    },
  ])
})

test('上限に達していたら、待つよう案内して拒否する', async () => {
  const { rpc } = rpcReturning({ data: false, error: null })
  const r = await consumeAskQuota(rpc)
  assert.equal(r.ok, false)
  if (r.ok === false) assert.match(r.error, /1分/)
})

test('回数の確認自体に失敗したときは許可せず（安全側に倒す）、内部エラー文は出さない', async () => {
  const { rpc } = rpcReturning({ data: null, error: { message: 'relation "x" does not exist' } })
  const r = await consumeAskQuota(rpc)
  assert.equal(r.ok, false)
  if (r.ok === false) assert.equal(r.error.includes('relation'), false)
})

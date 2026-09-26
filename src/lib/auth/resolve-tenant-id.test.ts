import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTenantId, shouldDenyForHost } from './resolve-tenant-id'

type Result = { data: { tenant_id?: string } | null; error: { message: string } | null }

/** employees 問い合わせ用の偽 Supabase クライアント */
function fakeSupabase(result: Result) {
  const maybeSingle = mock.fn(async () => result)
  const eq = mock.fn(() => ({ maybeSingle }))
  const select = mock.fn(() => ({ eq }))
  const from = mock.fn(() => ({ select }))
  return { client: { from } as never, from }
}

describe('resolveTenantId', () => {
  it('user_metadata は無視し employees の tenant_id を採用する', async () => {
    const { client, from } = fakeSupabase({ data: { tenant_id: 't-emp' }, error: null })
    const r = await resolveTenantId(client, { id: 'u1', user_metadata: { tenant_id: 't-meta' } })
    assert.deepEqual(r, { tenantId: 't-emp', failed: false })
    assert.equal(from.mock.callCount(), 1)
  })

  it('行が無い場合は metadata があっても tenantId null・failed false', async () => {
    const { client } = fakeSupabase({ data: null, error: null })
    const r = await resolveTenantId(client, { id: 'u1', user_metadata: { tenant_id: 't-meta' } })
    assert.deepEqual(r, { tenantId: null, failed: false })
  })

  it('DB エラー時は failed: true を返す', async () => {
    const { client } = fakeSupabase({ data: null, error: { message: 'boom' } })
    const r = await resolveTenantId(client, { id: 'u1' })
    assert.deepEqual(r, { tenantId: null, failed: true })
  })
})

describe('shouldDenyForHost', () => {
  const MYOU = ['t-myou']
  it('failed なら拒否しない', () => {
    assert.equal(shouldDenyForHost(true, { tenantId: null, failed: true }, MYOU), false)
  })
  it('app ホスト + MYOU テナントは拒否', () => {
    assert.equal(shouldDenyForHost(false, { tenantId: 't-myou', failed: false }, MYOU), true)
  })
  it('myou ホスト + 非 MYOU テナントは拒否', () => {
    assert.equal(shouldDenyForHost(true, { tenantId: 't-x', failed: false }, MYOU), true)
  })
  it('myou ホスト + テナント不明は拒否', () => {
    assert.equal(shouldDenyForHost(true, { tenantId: null, failed: false }, MYOU), true)
  })
  it('app ホスト + テナント不明は拒否しない', () => {
    assert.equal(shouldDenyForHost(false, { tenantId: null, failed: false }, MYOU), false)
  })
  it('整合していれば拒否しない', () => {
    assert.equal(shouldDenyForHost(true, { tenantId: 't-myou', failed: false }, MYOU), false)
    assert.equal(shouldDenyForHost(false, { tenantId: 't-x', failed: false }, MYOU), false)
  })
})
